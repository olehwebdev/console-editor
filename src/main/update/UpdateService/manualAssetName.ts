import type { ManualAsset } from './types';

/** Each system's part of a manual download's name, as electron-builder.ts names the files. */
const MANUAL_ASSETS: Partial<Record<NodeJS.Platform, ManualAsset>> = {
  darwin: { system: 'mac', ending: '.dmg' },
  win32: { system: 'win', ending: '-setup.exe' },
};

/** Linux, and any other system: the archive for a .tar.gz copy. */
const LINUX_ASSET: ManualAsset = { system: 'linux', ending: '.tar.gz' };

/** The file a manual update downloads: the disk image on macOS, the archive for a .tar.gz copy on Linux. */
export function manualAssetName(version: string, platform: NodeJS.Platform, arch: 'x64' | 'arm64'): string {
  const { system, ending } = MANUAL_ASSETS[platform] ?? LINUX_ASSET;
  return `console-editor-${version}-${system}-${arch}${ending}`;
}
