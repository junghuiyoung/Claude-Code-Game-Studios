import Phaser from 'phaser';
import { playCue } from './audio';
import {
  MOVEMENT_BINDINGS,
  getMovementDirection,
  getMovementKeyLabels,
  type KeyboardLayoutMap,
} from './controls';
import { connectPlatform } from './platform';
import type { GamePlatform } from './platform-types';
import './style.css';

const GRID_SIZE = 36;
const MOVE_SPEED = 240;
const MARKER_RADIUS = 12;
const MOVEMENT_CODES = new Set<string>(Object.values(MOVEMENT_BINDINGS).flat());

type DemoState = 'loading' | 'ready' | 'playing' | 'paused';

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing starter element: ${id}`);
  return element as T;
}

const playButton = requireElement<HTMLButtonElement>('play-toggle');
const resetButton = requireElement<HTMLButtonElement>('reset-demo');
const status = requireElement<HTMLParagraphElement>('status');

function showMovementKeyLabels(layoutMap?: KeyboardLayoutMap): void {
  const labels = getMovementKeyLabels(layoutMap);
  for (const [direction, label] of Object.entries(labels)) {
    requireElement<HTMLElement>(`movement-${direction}`).textContent = label;
  }
  requireElement<HTMLElement>('movement-key-hint').setAttribute(
    'aria-label',
    `Move: ${labels.up} up, ${labels.left} left, ${labels.down} down, ${labels.right} right`,
  );
}

async function loadMovementKeyLabels(): Promise<void> {
  showMovementKeyLabels();
  const keyboard = (navigator as Navigator & {
    keyboard?: { getLayoutMap?: () => Promise<KeyboardLayoutMap> };
  }).keyboard;
  if (!keyboard?.getLayoutMap) return;

  try {
    showMovementKeyLabels(await keyboard.getLayoutMap());
  } catch {
    // Layout access may be denied in an iframe; keep the QWERTY fallback.
  }
}

void loadMovementKeyLabels();
const platformReady = connectPlatform();

class StarterScene extends Phaser.Scene {
  private grid!: Phaser.GameObjects.Graphics;
  private marker!: Phaser.GameObjects.Arc;
  private heldCodes = new Set<string>();
  private state: DemoState = 'loading';
  private platform?: GamePlatform;

  create(): void {
    this.grid = this.add.graphics();
    this.marker = this.add.circle(0, 0, MARKER_RADIUS, 0x72e5bd).setStrokeStyle(2, 0xd0ffee);
    const keyboard = this.input.keyboard;
    if (keyboard) {
      // Phaser 4.2.1 passes the native KeyboardEvent through these events.
      keyboard.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKeyDown);
      keyboard.on(Phaser.Input.Keyboard.Events.ANY_KEY_UP, this.onKeyUp);
    }
    this.centerMarker();
    this.drawGrid();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.drawGrid, this);
    this.input.on('pointerup', this.onPointerUp, this);
    playButton.addEventListener('click', this.togglePlay);
    resetButton.addEventListener('click', this.reset);
    window.addEventListener('blur', this.clearHeldKeys);
    document.addEventListener('visibilitychange', this.clearHeldKeys);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.onKeyDown);
      keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_UP, this.onKeyUp);
      this.clearHeldKeys();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.drawGrid, this);
      this.input.off('pointerup', this.onPointerUp, this);
      playButton.removeEventListener('click', this.togglePlay);
      resetButton.removeEventListener('click', this.reset);
      window.removeEventListener('blur', this.clearHeldKeys);
      document.removeEventListener('visibilitychange', this.clearHeldKeys);
    });

    void platformReady.then((platform) => {
      this.platform = platform;
      document.documentElement.dataset.applicationType = platform.applicationType;
      document.documentElement.dataset.offline = String(platform.offline);
      this.setState('ready');
    });
  }

  update(_time: number, delta: number): void {
    if (this.state !== 'playing' || document.hidden) return;

    const { x, y } = getMovementDirection(this.heldCodes);
    if (x === 0 && y === 0) return;

    const distance = MOVE_SPEED * Math.min(delta, 50) / 1000 / Math.hypot(x, y);
    this.moveMarker(this.marker.x + x * distance, this.marker.y + y * distance);
  }

  private setState(state: DemoState): void {
    this.state = state;
    this.platform?.setPlaying(state === 'playing');
    status.textContent = { loading: 'Loading', ready: 'Ready', playing: 'Playing', paused: 'Paused' }[state];
    playButton.textContent = { loading: 'Start', ready: 'Start', playing: 'Pause', paused: 'Resume' }[state];
    playButton.disabled = state === 'loading';
    resetButton.disabled = state === 'loading' || state === 'ready';
  }

  private togglePlay = (): void => {
    if (this.state === 'loading') return;
    this.clearHeldKeys();
    this.setState(this.state === 'playing' ? 'paused' : 'playing');
    playCue();
  };

  private reset = (): void => {
    this.clearHeldKeys();
    this.setState('ready');
    this.centerMarker();
  };

  private clearHeldKeys = (): void => {
    this.heldCodes.clear();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      this.clearHeldKeys();
      return;
    }
    if (!MOVEMENT_CODES.has(event.code)) return;
    event.preventDefault();
    this.heldCodes.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.heldCodes.delete(event.code);
  };

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.state !== 'playing') return;
    this.moveMarker(pointer.x, pointer.y);
    playCue();
  }

  private moveMarker(x: number, y: number): void {
    const { width, height } = this.scale.gameSize;
    const edgeX = Math.min(MARKER_RADIUS, width / 2);
    const edgeY = Math.min(MARKER_RADIUS, height / 2);
    this.marker.setPosition(
      Phaser.Math.Clamp(x, edgeX, width - edgeX),
      Phaser.Math.Clamp(y, edgeY, height - edgeY),
    );
  }

  private centerMarker(): void {
    const { width, height } = this.scale.gameSize;
    this.moveMarker(width / 2, height / 2);
  }

  private drawGrid(): void {
    const { width, height } = this.scale.gameSize;
    this.grid.clear().lineStyle(1, 0x536783, 0.32);
    for (let x = 0; x < width; x += GRID_SIZE) this.grid.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += GRID_SIZE) this.grid.lineBetween(0, y, width, y);
    this.moveMarker(this.marker.x, this.marker.y);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#101b2b',
  audio: { noAudio: true },
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  scene: StarterScene,
});
