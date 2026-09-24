import { parseChangelog, type ChangelogEntry } from '@common/changelog';
import changelog from '../../../../../../CHANGELOG.md?raw';

/** Every released version's notes, newest first, as bundled with this build (so "What's New" works offline). */
export const RELEASES: readonly ChangelogEntry[] = parseChangelog(changelog).filter((entry) => entry.version.toLowerCase() !== 'unreleased');
