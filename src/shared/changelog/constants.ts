/** The `v` a release tag puts before its version ("v1.2.0"). */
export const RELEASE_TAG_PREFIX = 'v';

/** That prefix where a tag or heading may carry it. */
export const VERSION_TAG_PREFIX = new RegExp(`^${RELEASE_TAG_PREFIX}`);

/** The changelog's file name: in the repository, and so in each release's tag. */
export const CHANGELOG_FILE = 'CHANGELOG.md';
