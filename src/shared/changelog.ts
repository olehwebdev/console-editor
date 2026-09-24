/**
 * Reads CHANGELOG.md (Keep a Changelog format): one `## [version] - date`
 * section per release, newest first. The app shows these as "What's New",
 * and the release workflow puts a version's section at the top of its notes.
 */

export interface ChangelogEntry {
  /** "1.2.0", or "Unreleased". */
  version: string;
  /** ISO date from the heading, if any. */
  date: string | null;
  /** Markdown of the section, without its heading. */
  body: string;
}

const HEADING = /^## \[([^\]]+)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?\s*$/;
/** Link reference definitions (`[1.2.0]: https://…`) that end the file. */
const LINK_DEFINITION = /^\[[^\]]+\]:\s+\S+/;

export function parseChangelog(markdown: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: { version: string; date: string | null; lines: string[] } | null = null;
  const finish = () => {
    if (current) entries.push({ version: current.version, date: current.date, body: current.lines.join('\n').trim() });
  };
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = HEADING.exec(line);
    if (heading) {
      finish();
      current = { version: heading[1].replace(/^v/, ''), date: heading[2] ?? null, lines: [] };
    } else if (current && !LINK_DEFINITION.test(line)) {
      current.lines.push(line);
    }
  }
  finish();
  return entries;
}

/** The section for `version` ("1.2.0" or "v1.2.0"), or null when there is none. */
export function changelogSection(markdown: string, version: string): ChangelogEntry | null {
  const wanted = version.replace(/^v/, '');
  return parseChangelog(markdown).find((entry) => entry.version === wanted) ?? null;
}
