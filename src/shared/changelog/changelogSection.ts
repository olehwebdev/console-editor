import { VERSION_TAG_PREFIX } from './constants.ts';
import { parseChangelog } from './parseChangelog.ts';
import type { ChangelogEntry } from './types.ts';

/** The section for `version` ("1.2.0" or "v1.2.0"), or null when there is none. */
export function changelogSection(markdown: string, version: string): ChangelogEntry | null {
  const wanted = version.replace(VERSION_TAG_PREFIX, '');
  return parseChangelog(markdown).find((entry) => entry.version === wanted) ?? null;
}
