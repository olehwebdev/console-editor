import { CHANGELOG_FILE, RELEASE_TAG_PREFIX } from '../../shared/changelog';
import { REPO_SLUG } from '../appInfo';
import type { UpdateServiceOptions } from './UpdateService';

/** GitHub's REST API for the repository, and its files as of a tag. */
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_SLUG}`;
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${REPO_SLUG}`;

/** The newest release, on GitHub's REST API and on a local update server alike. */
const LATEST_RELEASE_PATH = 'releases/latest';
/** Where a local update server serves a version's changelog section. */
const LOCAL_CHANGELOG_PATH = 'changelog';

/** Where the updater looks: GitHub, or a local update server standing in for it (tests). */
export function updateEndpoints(feed: string | undefined): UpdateServiceOptions['endpoints'] {
  return feed
    ? { latestRelease: `${feed}/${LATEST_RELEASE_PATH}`, changelog: (v) => `${feed}/${LOCAL_CHANGELOG_PATH}/${RELEASE_TAG_PREFIX}${v}` }
    : {
        latestRelease: `${GITHUB_API_URL}/${LATEST_RELEASE_PATH}`,
        changelog: (v) => `${GITHUB_RAW_URL}/${RELEASE_TAG_PREFIX}${v}/${CHANGELOG_FILE}`,
      };
}
