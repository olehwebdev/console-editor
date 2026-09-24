import { VERSION_TAG_PREFIX } from './constants.ts';
import type { ChangelogEntry } from './types.ts';

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
      current = { version: heading[1].replace(VERSION_TAG_PREFIX, ''), date: heading[2] ?? null, lines: [] };
    } else if (current && !LINK_DEFINITION.test(line)) {
      current.lines.push(line);
    }
  }
  finish();
  return entries;
}
