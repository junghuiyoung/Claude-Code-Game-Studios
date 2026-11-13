import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as controls from '../src/phaser/controls.ts';

const {
  MOVEMENT_BINDINGS,
  getMovementDirection,
  getMovementKeyLabels,
} = controls;

const directionCases = [
  { scenario: 'no held keys', codes: [], expected: { x: 0, y: 0 } },
  { scenario: 'an unrelated key', codes: ['Space'], expected: { x: 0, y: 0 } },
  { scenario: 'physical W', codes: ['KeyW'], expected: { x: 0, y: -1 } },
  { scenario: 'physical A', codes: ['KeyA'], expected: { x: -1, y: 0 } },
  { scenario: 'physical S', codes: ['KeyS'], expected: { x: 0, y: 1 } },
  { scenario: 'physical D', codes: ['KeyD'], expected: { x: 1, y: 0 } },
  { scenario: 'up arrow', codes: ['ArrowUp'], expected: { x: 0, y: -1 } },
  { scenario: 'left arrow', codes: ['ArrowLeft'], expected: { x: -1, y: 0 } },
  { scenario: 'down arrow', codes: ['ArrowDown'], expected: { x: 0, y: 1 } },
  { scenario: 'right arrow', codes: ['ArrowRight'], expected: { x: 1, y: 0 } },
  { scenario: 'opposite letters', codes: ['KeyA', 'KeyD', 'KeyW', 'KeyS'], expected: { x: 0, y: 0 } },
  { scenario: 'opposite arrows', codes: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], expected: { x: 0, y: 0 } },
  { scenario: 'opposite mixed bindings', codes: ['KeyW', 'ArrowDown', 'KeyA', 'ArrowRight'], expected: { x: 0, y: 0 } },
  { scenario: 'both up bindings', codes: ['KeyW', 'ArrowUp'], expected: { x: 0, y: -1 } },
  { scenario: 'both left bindings', codes: ['KeyA', 'ArrowLeft'], expected: { x: -1, y: 0 } },
  { scenario: 'both down bindings', codes: ['KeyS', 'ArrowDown'], expected: { x: 0, y: 1 } },
  { scenario: 'both right bindings', codes: ['KeyD', 'ArrowRight'], expected: { x: 1, y: 0 } },
  { scenario: 'two up bindings and one down', codes: ['KeyW', 'ArrowUp', 'KeyS'], expected: { x: 0, y: 0 } },
  { scenario: 'two right bindings and one left', codes: ['KeyD', 'ArrowRight', 'KeyA'], expected: { x: 0, y: 0 } },
  { scenario: 'a letter diagonal', codes: ['KeyW', 'KeyD'], expected: { x: 1, y: -1 } },
  { scenario: 'a mixed diagonal', codes: ['KeyA', 'ArrowDown'], expected: { x: -1, y: 1 } },
];

for (const { scenario, codes, expected } of directionCases) {
  test(`${scenario} produces direction (${expected.x}, ${expected.y})`, () => {
    // Arrange
    const heldCodes = new Set(codes);

    // Act
    const direction = getMovementDirection(heldCodes);

    // Assert
    assert.deepEqual(direction, expected);
    assert.deepEqual([...heldCodes], codes, 'reading direction leaves held keys unchanged');
  });
}

test('no layout map produces QWERTY movement labels', () => {
  // Arrange: the browser has no keyboard layout map.
  const layoutMap = undefined;

  // Act
  const labels = getMovementKeyLabels(layoutMap);

  // Assert
  assert.deepEqual(labels, { up: 'W', left: 'A', down: 'S', right: 'D' });
});

test('a QWERTY layout map produces uppercase QWERTY movement labels', () => {
  // Arrange
  const layoutMap = new Map([['KeyW', 'w'], ['KeyA', 'a'], ['KeyS', 's'], ['KeyD', 'd']]);

  // Act
  const labels = getMovementKeyLabels(layoutMap);

  // Assert
  assert.deepEqual(labels, { up: 'W', left: 'A', down: 'S', right: 'D' });
});

test('an AZERTY layout map produces ZQSD movement labels', () => {
  // Arrange
  const layoutMap = new Map([['KeyW', 'z'], ['KeyA', 'q'], ['KeyS', 's'], ['KeyD', 'd']]);

  // Act
  const labels = getMovementKeyLabels(layoutMap);

  // Assert
  assert.deepEqual(labels, { up: 'Z', left: 'Q', down: 'S', right: 'D' });
});

test('a layout map missing a code falls back only that key to its QWERTY label', () => {
  // Arrange
  const layoutMap = new Map([['KeyW', 'z'], ['KeyS', 's'], ['KeyD', 'd']]);

  // Act
  const labels = getMovementKeyLabels(layoutMap);

  // Assert
  assert.deepEqual(labels, { up: 'Z', left: 'A', down: 'S', right: 'D' });
});

test('an empty layout character falls back to its QWERTY label', () => {
  // Arrange
  const layoutMap = new Map([['KeyW', '']]);

  // Act
  const labels = getMovementKeyLabels(layoutMap);

  // Assert
  assert.equal(labels.up, 'W');
});

test('movement bindings contain exactly the physical letter and arrow codes and never Escape', () => {
  // Arrange
  const expectedCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

  // Act
  const boundCodes = Object.values(MOVEMENT_BINDINGS).flat();

  // Assert
  assert.deepEqual([...boundCodes].sort(), expectedCodes.sort());
  assert.equal(boundCodes.includes('Escape'), false);
});

// Integration fixture: run main.ts itself; mock only its browser/platform/rendering dependencies.
async function sceneFixture(t) {
  const elements = new Map();
  for (const id of ['play-toggle', 'reset-demo', 'status', 'movement-key-hint',
    'movement-up', 'movement-left', 'movement-down', 'movement-right']) {
    elements.set(id, Object.assign(new EventTarget(), {
      textContent: '',
      setAttribute() {},
    }));
  }
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: { dataset: {} },
    getElementById: (id) => elements.get(id),
  });
  const keyboard = new EventEmitter();
  const platformReady = Promise.resolve({ applicationType: 'web', offline: false, setPlaying() {} });
  let scene;
  let marker;

  class Scene {
    input = Object.assign(new EventEmitter(), { keyboard });
    scale = Object.assign(new EventEmitter(), { gameSize: { width: 320, height: 240 } });
    events = new EventEmitter();
    add = {
      graphics() {
        return { clear() { return this; }, lineStyle() { return this; }, lineBetween() {} };
      },
      circle(x, y) {
        marker = {
          x, y,
          setStrokeStyle() { return this; },
          setPosition(x, y) { this.x = x; this.y = y; },
        };
        return marker;
      },
    };
  }

  const Phaser = {
    Scene,
    Game: class {
      constructor(config) {
        scene = new config.scene();
        t.after(() => scene.events.emit('shutdown'));
        scene.create();
      }
    },
    Input: { Keyboard: { Events: { ANY_KEY_DOWN: 'keydown', ANY_KEY_UP: 'keyup' } } },
    Scale: { Events: { RESIZE: 'resize' }, RESIZE: 1 },
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    Math: { Clamp: (value, min, max) => Math.min(max, Math.max(min, value)) },
  };
  const modules = {
    phaser: { default: Phaser },
    './controls': controls,
    './audio': { playCue() {} },
    './platform': { connectPlatform: () => platformReady },
    './style.css': {},
  };
  const source = await readFile(new URL('../src/phaser/main.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports: {},
    require(id) {
      assert.ok(Object.hasOwn(modules, id), `Unexpected scene dependency: ${id}`);
      return modules[id];
    },
    document,
    window: new EventTarget(),
    navigator: {},
  });
  await platformReady;
  elements.get('play-toggle').dispatchEvent(new Event('click'));
  return { scene, keyboard, marker };
}

function keyboardEvent(code, key) {
  return { code, key, ctrlKey: false, metaKey: false, altKey: false, preventDefault() {} };
}

test('the scene moves up for code KeyW even when the AZERTY key character is z', async (t) => {
  // Arrange
  const { scene, keyboard, marker } = await sceneFixture(t);
  const before = { x: marker.x, y: marker.y };
  const frameDeltaMs = 16;

  // Act: dispatch through the listener installed by the production scene.
  keyboard.emit('keydown', keyboardEvent('KeyW', 'z'));
  scene.update(0, frameDeltaMs);

  // Assert
  assert.equal(marker.x, before.x);
  assert.ok(marker.y < before.y, 'physical KeyW must move the marker up');
});

test('the scene stays still for code KeyZ even when the key character is w', async (t) => {
  // Arrange
  const { scene, keyboard, marker } = await sceneFixture(t);
  const before = { x: marker.x, y: marker.y };
  const frameDeltaMs = 16;

  // Act
  keyboard.emit('keydown', keyboardEvent('KeyZ', 'w'));
  scene.update(0, frameDeltaMs);

  // Assert
  assert.deepEqual({ x: marker.x, y: marker.y }, before);
});
