/** Runtime capabilities available to the starter after platform setup. */
export interface GamePlatform {
  readonly applicationType: string;
  readonly offline: boolean;
  setPlaying(playing: boolean): void;
}

export const standalonePlatform: GamePlatform = {
  applicationType: 'web',
  offline: false,
  setPlaying() {},
};
