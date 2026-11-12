import { standalonePlatform, type GamePlatform } from './platform-types.ts';

/** Starts the standalone build without network or portal dependencies. */
export async function connectPlatform(): Promise<GamePlatform> {
  return standalonePlatform;
}
