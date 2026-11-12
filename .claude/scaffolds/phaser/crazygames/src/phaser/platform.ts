import { standalonePlatform, type GamePlatform } from './platform-types.ts';

interface CrazyGamesSdk {
  init(): Promise<void>;
  environment: string;
  user?: { systemInfo?: { applicationType?: string } };
  game: {
    isOfflineMode?: boolean;
    gameplayStart(): void;
    gameplayStop(): void;
  };
}

type SdkLoader = () => Promise<CrazyGamesSdk | undefined>;

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const SDK_STARTUP_TIMEOUT_MS = 2500;

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

    let playing = false;
    return {
      applicationType: sdk.user?.systemInfo?.applicationType ?? 'web',
      offline: sdk.game.isOfflineMode === true,
      setPlaying(next) {
        if (next === playing) return;
        playing = next;
        try {
          if (playing) sdk.game.gameplayStart();
          else sdk.game.gameplayStop();
        } catch (error) {
          console.warn('CrazyGames could not report the gameplay state.', error);
        }
      },
    };
  } catch {
    return standalonePlatform;
  } finally {
    clearTimeout(timer);
  }
}
