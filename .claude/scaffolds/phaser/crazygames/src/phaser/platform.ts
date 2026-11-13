import { standalonePlatform, type GamePlatform } from './platform-types.ts';

interface GameSettings {
  muteAudio?: boolean;
}

interface CrazyGamesSdk {
  init(): Promise<void>;
  environment: string;
  user?: {
    systemInfo?: {
      applicationType?: string;
      device?: { type?: unknown };
      locale?: unknown;
    };
  };
  game: {
    isOfflineMode?: boolean;
    settings?: GameSettings;
    addSettingsChangeListener?(listener: (settings: GameSettings) => void): void;
    removeSettingsChangeListener?(listener: (settings: GameSettings) => void): void;
    gameplayStart(): void;
    gameplayStop(): void;
  };
}

type SdkLoader = () => Promise<CrazyGamesSdk | undefined>;

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const SDK_STARTUP_TIMEOUT_MS = 2500;

function isTextField(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return element?.isContentEditable === true
    || ['input', 'textarea', 'select'].includes(element?.tagName?.toLowerCase() ?? '')
    || element?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]') != null;
}

/** Prevents embedded-page scrolling and menus without blocking editing or key delivery. */
export function installEmbeddedPageFixes(target: EventTarget): () => void {
  const preventPageDefault = (event: Event) => {
    if (!isTextField(event.target)) event.preventDefault();
  };
  const preventScrollingKey = (event: Event) => {
    const key = event as KeyboardEvent;
    if (key.ctrlKey || key.metaKey || key.altKey) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(key.code)
      || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key.key)) {
      preventPageDefault(event);
    }
  };
  target.addEventListener('wheel', preventPageDefault, { passive: false });
  target.addEventListener('keydown', preventScrollingKey);
  target.addEventListener('contextmenu', preventPageDefault);
  return () => {
    target.removeEventListener('wheel', preventPageDefault);
    target.removeEventListener('keydown', preventScrollingKey);
    target.removeEventListener('contextmenu', preventPageDefault);
  };
}

function getSdk(): CrazyGamesSdk | undefined {
  const host = window as Window & { CrazyGames?: { SDK?: CrazyGamesSdk } };
  return host.CrazyGames?.SDK;
}

function loadBrowserSdk(): Promise<CrazyGamesSdk | undefined> {
  const existingSdk = getSdk();
  if (existingSdk) return Promise.resolve(existingSdk);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.addEventListener('load', () => resolve(getSdk()), { once: true });
    script.addEventListener('error', () => resolve(undefined), { once: true });
    document.head.append(script);
  });
}

/** Starts the optional HTML5 SDK, with a bounded wait before standalone fallback. */
export async function connectPlatform(
  loadSdk: SdkLoader = loadBrowserSdk,
  timeoutMs = SDK_STARTUP_TIMEOUT_MS,
  eventTarget: EventTarget | undefined = typeof window === 'undefined' ? undefined : window,
): Promise<GamePlatform> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  try {
    const initialize = async () => {
      const sdk = await loadSdk();
      if (!sdk || timedOut) return undefined;
      await sdk.init();
      return sdk;
    };

    const timeout = new Promise<undefined>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve(undefined);
      }, timeoutMs);
    });

    const sdk = await Promise.race([initialize(), timeout]);
    if (!sdk || (sdk.environment !== 'crazygames' && sdk.environment !== 'local')) {
      return standalonePlatform;
    }

    const systemInfo = sdk.user?.systemInfo;
    const deviceType = systemInfo?.device?.type;
    const locale = systemInfo?.locale;
    let muted = sdk.game.settings?.muteAudio === true;
    let disposed = false;
    const mutedListeners = new Set<(muted: boolean) => void>();
    // Keep the getter current between scene subscriptions until the owner disposes the adapter.
    const onSettingsChange = (settings: GameSettings) => {
      if (disposed) return;
      const next = settings?.muteAudio === true;
      if (next === muted) return;
      muted = next;
      for (const listener of mutedListeners) listener(muted);
    };
    const settingsListenerAdded = sdk.game.addSettingsChangeListener !== undefined;
    sdk.game.addSettingsChangeListener?.(onSettingsChange);
    const removePageListeners = eventTarget ? installEmbeddedPageFixes(eventTarget) : undefined;

    let playing = false;
    const reportPlaying = (next: boolean) => {
      if (next === playing) return;
      playing = next;
      try {
        if (playing) sdk.game.gameplayStart();
        else sdk.game.gameplayStop();
      } catch (error) {
        console.warn('CrazyGames could not report the gameplay state.', error);
      }
    };
    return {
      applicationType: systemInfo?.applicationType ?? 'web',
      offline: sdk.game.isOfflineMode === true,
      deviceType: deviceType === 'desktop' || deviceType === 'tablet' || deviceType === 'mobile'
        ? deviceType : undefined,
      locale: typeof locale === 'string' && locale.trim() ? locale : undefined,
      get muted() { return muted; },
      onMutedChange(listener) {
        if (!disposed) mutedListeners.add(listener);
        return () => { mutedListeners.delete(listener); };
      },
      setPlaying(next) {
        if (!disposed) reportPlaying(next);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        mutedListeners.clear();
        reportPlaying(false);
        try {
          if (settingsListenerAdded) sdk.game.removeSettingsChangeListener?.(onSettingsChange);
        } finally {
          removePageListeners?.();
        }
      },
    };
  } catch {
    return standalonePlatform;
  } finally {
    clearTimeout(timer);
  }
}
