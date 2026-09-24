import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AvailableUpdate } from '../../../shared/types';
import { CHECKSUMS_ASSET, CONTENT_LENGTH_HEADER, PARTIAL_DOWNLOAD_SUFFIX } from './constants';
import { fetchExpectedHash } from './fetchExpectedHash';
import { manualAssetName } from './manualAssetName';
import { saveVerified } from './saveVerified';
import type { GitHubRelease, UpdateServiceOptions } from './types';

/**
 * Downloads the file for this system from `release` (the one kept with the offer) to Downloads,
 * checked against the release's SHA-256 sums, and returns where it is. `onProgress` hears the percent done.
 */
export async function downloadManually(
  release: GitHubRelease | null,
  update: AvailableUpdate,
  opts: UpdateServiceOptions,
  onProgress: (percent: number) => void,
): Promise<string> {
  if (!release) throw new Error('check for updates again');
  const name = manualAssetName(update.version, opts.platform, opts.arch);
  const asset = release.assets.find((a) => a.name === name);
  const sums = release.assets.find((a) => a.name === CHECKSUMS_ASSET);
  if (!asset) throw new Error(`the release has no ${name}`);
  if (!sums) throw new Error("the release has no checksums to verify it with");
  const expected = await fetchExpectedHash(opts.fetch, sums.browser_download_url, name);

  const target = join(opts.downloadsDir, name);
  const partial = `${target}${PARTIAL_DOWNLOAD_SUFFIX}`;
  await mkdir(opts.downloadsDir, { recursive: true });
  const res = await opts.fetch(asset.browser_download_url);
  if (!res.ok || !res.body) throw new Error(`GitHub answered ${res.status}`);
  const total = Number(res.headers.get(CONTENT_LENGTH_HEADER)) || asset.size;
  // Written as it arrives, and renamed into place only once its checksum is right.
  await saveVerified(res.body, partial, target, expected, (received) => {
    if (total) onProgress((received / total) * 100);
  });
  return target;
}
