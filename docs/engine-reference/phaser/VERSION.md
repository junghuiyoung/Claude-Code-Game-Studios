# Phaser — Version Reference

| Field | Value |
|-------|-------|
| **Engine Version** | Phaser 4.2.1 |
| **Installed at pin time** | NOT DETERMINED — the template does not install dependencies. Check `node_modules/phaser/package.json` after `npm ci`. |
| **Release Date** | 2026-07-09 |
| **Last Docs Verified** | 2026-11-11 |

The starter pins Phaser 4.2.1 with TypeScript and Vite. Phaser is an npm package,
so verify the installed version with the package manifest rather than looking for
an editor binary. Use `npm ci` with the lockfile and `npm run build` to verify the
production `dist/` output. The starter requires Node.js 22.18.0 or newer.

## Knowledge gap

Phaser 3 examples are not always valid for Phaser 4. Check the migration guide
and the pinned API for rendering, shaders and game object effects. In particular:

- Phaser 4 uses WebGL render nodes in place of custom Phaser 3 pipelines.
- The old `preFX` and `postFX` hooks and bitmap masks are replaced by filters.
- `DynamicTexture` and `RenderTexture` require an explicit `render()` call to
  execute buffered draw commands.
- Phaser 4 deprecates the Canvas renderer. Use WebGL and test it in the browsers
  the game targets.

## Sources

- [Phaser 4.2.1 release](https://phaser.io/download/release/v4.2.1)
- [Phaser 4.0 migration guide](https://github.com/phaserjs/phaser/blob/v4.0.0/changelog/v4/4.0/MIGRATION-GUIDE.md)
- [Phaser API documentation](https://phaser.io/kernel/docs)
- [Vite setup and Node compatibility](https://vite.dev/guide/)
