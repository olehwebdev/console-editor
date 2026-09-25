import type { AutoInstaller } from './types';

/** Has `installer` download the update to its cache; throws when the release has none for this system. */
export async function downloadWithInstaller(installer: AutoInstaller, onProgress: (percent: number) => void): Promise<void> {
  const version = await installer.check();
  if (!version) throw new Error('this release has no update for your system yet');
  await installer.download(onProgress);
}
