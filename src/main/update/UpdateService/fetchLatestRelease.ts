import { GITHUB_JSON, RATE_LIMITED_STATUSES } from './constants';
import type { GitHubRelease, UpdateServiceOptions } from './types';

/** The latest release, as GitHub's REST API describes it; throws with a readable message when it can't be had. */
export async function fetchLatestRelease({ fetch, endpoints }: UpdateServiceOptions): Promise<GitHubRelease> {
  const res = await fetch(endpoints.latestRelease, { headers: { Accept: GITHUB_JSON } });
  if (RATE_LIMITED_STATUSES.has(res.status)) throw new Error('GitHub is limiting requests, try again later');
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const release = (await res.json()) as GitHubRelease;
  if (typeof release?.tag_name !== 'string' || !Array.isArray(release.assets)) throw new Error('unexpected answer from GitHub');
  return release;
}
