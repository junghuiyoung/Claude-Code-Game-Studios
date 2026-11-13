/** Runtime capabilities available to the starter after platform setup. */
export interface GamePlatform {
  /** Platform application context, such as web or a portal's native app. */
  readonly applicationType: string;
  /** Whether the platform reports that this session is offline. */
  readonly offline: boolean;
  /** Device category supplied by the platform; never inferred from touch support. */
  readonly deviceType: 'desktop' | 'tablet' | 'mobile' | undefined;
  /** Platform locale for translation selection, or undefined when none was supplied. */
  readonly locale: string | undefined;
  /** Current platform audio restriction; takes priority over in-game audio settings. */
  readonly muted: boolean;
  /** Subscribes to mute transitions without an initial call; returns an unsubscribe function. */
  onMutedChange(listener: (muted: boolean) => void): () => void;
  /** Reports an actual gameplay transition, ignoring repeated states. */
  setPlaying(playing: boolean): void;
  /**
   * Stops play and releases platform listeners once; later reports and subscriptions are inactive.
   * The owner tearing down the whole game (for example, an in-page restart) calls this.
   * The starter shares one platform for the page lifetime, so scene shutdown must not dispose it.
   */
  dispose(): void;
}

/** Default capabilities for a session without a connected platform SDK. */
export const standalonePlatform: GamePlatform = {
  applicationType: 'web',
  offline: false,
  deviceType: undefined,
  locale: undefined,
  muted: false,
  onMutedChange() { return () => {}; },
  setPlaying() {},
  dispose() {},
};
