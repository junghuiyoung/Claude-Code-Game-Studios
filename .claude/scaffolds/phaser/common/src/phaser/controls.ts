// Q-KEY-1 / Q-KEY-2: physical movement keys; Escape and Ctrl/Cmd+W are never bound.

/** Physical letter and arrow codes grouped by their movement action. */
export const MOVEMENT_BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  left: ['KeyA', 'ArrowLeft'],
  down: ['KeyS', 'ArrowDown'],
  right: ['KeyD', 'ArrowRight'],
} as const;

type MovementAction = keyof typeof MOVEMENT_BINDINGS;
type DirectionAxis = -1 | 0 | 1;

/** Signed movement along each axis, with opposing inputs resolved to zero. */
export interface MovementDirection {
  x: DirectionAxis;
  y: DirectionAxis;
}

/** The read-only lookup provided by a browser keyboard layout map. */
export interface KeyboardLayoutMap {
  /** Returns the character at a physical code, or undefined when it is absent. */
  get(code: string): string | undefined;
}

/** Resolves held physical codes once per direction; opposite directions cancel. */
export function getMovementDirection(heldCodes: ReadonlySet<string>): MovementDirection {
  const held = (action: MovementAction) =>
    MOVEMENT_BINDINGS[action].some((code) => heldCodes.has(code));

  return {
    x: (Number(held('right')) - Number(held('left'))) as DirectionAxis,
    y: (Number(held('down')) - Number(held('up'))) as DirectionAxis,
  };
}

/** Labels the four physical movement keys using a layout map, with QWERTY fallbacks. */
export function getMovementKeyLabels(layoutMap?: KeyboardLayoutMap): Record<MovementAction, string> {
  const label = (action: MovementAction) => {
    const code = MOVEMENT_BINDINGS[action][0];
    return (layoutMap?.get(code) || code.slice(3)).toUpperCase();
  };

  return { up: label('up'), left: label('left'), down: label('down'), right: label('right') };
}
