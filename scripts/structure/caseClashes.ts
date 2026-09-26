import { lookupNames } from './lookupNames.ts';
import type { FolderEntry } from './types.ts';

/**
 * The entries of one folder that a file system ignoring case (macOS, Windows) can't tell apart, in groups of names:
 * two whose names differ only in case (`Foo.css`, `foo.css`), or two modules an import without an extension reaches
 * by names that do (`./ActionFields` finds `actionFields.ts` there before `ActionFields.tsx`). `Markdown.tsx` beside
 * `markdown.css` is fine: a stylesheet is imported by its whole name.
 */
export function caseClashes(entries: FolderEntry[]): string[][] {
  // Each name a lookup can use, lower-cased → the entries it reaches, each with the spelling that reaches it.
  const reached = new Map<string, Map<string, string>>();
  for (const entry of entries) {
    for (const spelling of lookupNames(entry)) {
      const key = spelling.toLowerCase();
      reached.set(key, (reached.get(key) ?? new Map<string, string>()).set(entry.name, spelling));
    }
  }
  // A lookup that reaches entries spelled alike is no clash (`Foo.ts` beside `Foo.tsx`); one pair can clash twice.
  const groups = new Map<string, string[]>();
  for (const spellings of reached.values()) {
    if (new Set(spellings.values()).size < 2) continue;
    const names = [...spellings.keys()].sort();
    groups.set(JSON.stringify(names), names);
  }
  return [...groups.values()];
}
