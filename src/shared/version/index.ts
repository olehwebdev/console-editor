/**
 * Semantic-version comparison for release tags ("v1.2.3", "1.2.3-beta.1").
 * Only what the updater needs: a release is newer, older or the same.
 */
export { compareVersions } from './compareVersions';
export { isNewerVersion } from './isNewerVersion';
