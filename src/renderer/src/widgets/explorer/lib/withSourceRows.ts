import type { ResourceRow } from '@/entities/resource';
import { buildSourceRows, bundleNestKey, isMappableKind } from '@/entities/source-map';
import { bundleNestOf } from './bundleNestOf';
import type { ExplorerRow, SourceRowsInput } from './types';

/**
 * Nests originals under the page's scripts and stylesheets. A bundle's nest is closed until opened,
 * and open while the filter matches some of its loaded originals. Documents, and files known to
 * have no map, have none.
 */
export function withSourceRows(rows: readonly ResourceRow[], { byBundle, isOpen, query, matching }: SourceRowsInput): ExplorerRow[] {
  const out: ExplorerRow[] = [];
  for (const row of rows) {
    if (row.type !== 'file') {
      out.push(row);
      continue;
    }
    const { url, kind } = row.entry;
    const state = byBundle[url];
    const nest = isMappableKind(kind) ? bundleNestOf(state, url) : null;
    if (!nest || !isMappableKind(kind)) {
      out.push({ ...row, nest: null });
      continue;
    }
    const key = bundleNestKey(url);
    const expanded = matching.has(url) || isOpen(key, false);
    out.push({ ...row, expanded, nest });
    if (!expanded) continue;
    // A loop, not a spread: a map can list tens of thousands of files.
    for (const source of buildSourceRows({ bundleUrl: url, bundleKind: kind, parentKey: key, depth: row.depth + 1, isOpen, query }, state)) out.push(source);
  }
  return out;
}
