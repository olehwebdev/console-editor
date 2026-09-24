/**
 * Reads CHANGELOG.md (Keep a Changelog format): one `## [version] - date`
 * section per release, newest first. The app shows these as "What's New",
 * and the release workflow puts a version's section at the top of its notes.
 *
 * Imports carry `.ts`: scripts/release-notes.ts runs this with plain `node`.
 */
export { changelogSection } from './changelogSection.ts';
export { CHANGELOG_FILE, RELEASE_TAG_PREFIX, VERSION_TAG_PREFIX } from './constants.ts';
export { parseChangelog } from './parseChangelog.ts';
export type { ChangelogEntry } from './types.ts';
