"""blender-cleanup.py — bring a generated 3D model (GLB/glTF) to an asset spec:
decimate to a triangle budget, scale to a height, move the origin, export.

Run it inside Blender, headless:
  blender --background --python .claude/scripts/blender-cleanup.py -- \
      IN OUT [--tris N] [--height METRES] [--origin bottom|center|keep]

  IN        a .glb or .gltf file (the generator's output)
  OUT       the file to write; its extension picks the format: .glb, .gltf,
            .fbx or .obj
  --tris    triangle budget from the spec's Polycount; omitted: no decimation
  --height  the model's height in metres (Z); omitted: the scale is kept
  --origin  bottom (default): the bounding box's bottom centre at 0,0,0;
            center: its centre there; keep: as imported

EMITS OBSERVATIONS, NOT A VERDICT (CLAUDE.md, "Helpers in .claude/scripts/").
Output: TSV rows on stdout, each prefixed `CLEANUP\t` so they can be told apart
from Blender's own log:
  in <path> / out <path> / tris_before <n> / tris_after <n> / target <n|->
  height_before <m> / height_after <m> / origin <mode> / exported <yes|no>
  SKIPPED <step> <why>
Exit codes: 0 ran; 2 usage error; 3 import or export failed.
"""
import sys

import bpy  # only inside Blender
from mathutils import Vector


def row(*cols):
    print("CLEANUP\t" + "\t".join(str(c) for c in cols), flush=True)


def usage(msg):
    print(f"blender-cleanup: {msg} (see the header of this file)", file=sys.stderr)
    sys.exit(2)


argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
pos, opts = [], {"tris": None, "height": None, "origin": "bottom"}
i = 0
while i < len(argv):
    a = argv[i]
    if a in ("--tris", "--height", "--origin"):
        if i + 1 >= len(argv):
            usage(f"{a} needs a value")
        opts[a[2:]] = argv[i + 1]
        i += 2
    elif a.startswith("--"):
        usage(f"unknown option {a}")
    else:
        pos.append(a)
        i += 1
if len(pos) != 2:
    usage("needs IN and OUT")
src, dst = pos
try:
    target = int(opts["tris"]) if opts["tris"] is not None else None
    height = float(opts["height"]) if opts["height"] is not None else None
except ValueError:
    usage("--tris is a whole number and --height a number")
if opts["origin"] not in ("bottom", "center", "keep"):
    usage("--origin is bottom, center or keep")
ext = dst.lower().rsplit(".", 1)[-1]
if ext not in ("glb", "gltf", "fbx", "obj"):
    usage("OUT must end in .glb, .gltf, .fbx or .obj")

bpy.ops.wm.read_factory_settings(use_empty=True)
try:
    bpy.ops.import_scene.gltf(filepath=src)
except Exception as e:  # noqa: BLE001 - report any import failure
    row("in", src)
    row("SKIPPED", "import", repr(e))
    sys.exit(3)
row("in", src)
row("out", dst)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]


def tris():
    deps = bpy.context.evaluated_depsgraph_get()
    n = 0
    for o in meshes:
        m = o.evaluated_get(deps).to_mesh()
        n += sum(len(p.vertices) - 2 for p in m.polygons)
        o.evaluated_get(deps).to_mesh_clear()
    return n


def bbox():
    lo = Vector((float("inf"),) * 3)
    hi = Vector((float("-inf"),) * 3)
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


before = tris()
row("tris_before", before)
row("target", target if target is not None else "-")
if not meshes:
    row("SKIPPED", "all", "no mesh objects in the file")
elif target is not None and before > target:
    ratio = max(target / before, 0.0001)
    for o in meshes:
        if o.data.users > 1:
            o.data = o.data.copy()  # shared mesh data cannot take an applied modifier
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        mod = o.modifiers.new("decimate", "DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = ratio
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except Exception as e:  # noqa: BLE001
            row("SKIPPED", "decimate", f"{o.name}: {e!r}")
elif target is not None:
    row("SKIPPED", "decimate", f"already {before} <= {target}")
row("tris_after", tris())

if meshes:
    lo, hi = bbox()
    h0 = hi.z - lo.z
    row("height_before", round(h0, 4))
    roots = [o for o in bpy.context.scene.objects if o.parent is None]
    if height is not None and h0 > 0:
        s = height / h0
        for o in roots:
            o.scale = o.scale * s
            o.location = o.location * s
        bpy.context.view_layer.update()
    elif height is not None:
        row("SKIPPED", "scale", "model has zero height")
    if opts["origin"] != "keep":
        lo, hi = bbox()
        centre = (lo + hi) / 2
        shift = Vector((-centre.x, -centre.y, -(lo.z if opts["origin"] == "bottom" else centre.z)))
        for o in roots:
            o.location = o.location + shift
        bpy.context.view_layer.update()
    lo, hi = bbox()
    row("height_after", round(hi.z - lo.z, 4))
row("origin", opts["origin"])

try:
    if ext in ("glb", "gltf"):
        bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB" if ext == "glb" else "GLTF_SEPARATE")
    elif ext == "fbx":
        bpy.ops.export_scene.fbx(filepath=dst, apply_unit_scale=True)
    else:
        bpy.ops.wm.obj_export(filepath=dst)
except Exception as e:  # noqa: BLE001
    row("exported", "no")
    row("SKIPPED", "export", repr(e))
    sys.exit(3)
row("exported", "yes")
