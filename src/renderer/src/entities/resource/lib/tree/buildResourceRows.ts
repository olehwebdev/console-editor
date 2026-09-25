import type { FileKind, ResourceEntry } from '@common/types';
import { WEB_SCHEME } from './constants';
import { matchesQuery } from './matchesQuery';
import { parsed } from './parsed';
import { subfolder } from './subfolder';
import type { Folder, ResourceRow } from './types';

const KIND_ORDER: Record<FileKind, number> = { Document: 0, Script: 1, Stylesheet: 2 };
/** Same order as `localeCompare`, without its per-call setup. */
const { compare } = new Intl.Collator();
/** Between a file row's folder path and its URL: NUL, which neither contains, so a file's key never equals a folder's. */
const FILE_KEY_SEPARATOR = '\u0000';

/**
 * Flattens resources into tree rows (origin → folders → files) for a
 * virtualized list. Single-child folder chains are compacted (`static/js`) like
 * VS Code; while filtering every folder is shown expanded. URLs in `include`
 * are listed even when they don't match (bundles whose originals do).
 */
export function buildResourceRows(entries: ResourceEntry[], query: string, collapsed: ReadonlySet<string>, include?: ReadonlySet<string>): ResourceRow[] {
  const byOrigin = new Map<string, Folder>();
  for (const entry of entries) {
    if (!matchesQuery(entry, query) && !include?.has(entry.url)) continue;
    const { origin, dirs, file } = parsed(entry.url);
    let folder = subfolder(byOrigin, origin);
    folder.count++;
    for (const dir of dirs) {
      folder = subfolder(folder.folders, dir);
      folder.count++;
    }
    folder.files.push({ entry, file });
  }

  const rows: ResourceRow[] = [];
  const filtering = query.length > 0;

  const walk = (folder: Folder, path: string, depth: number) => {
    const subfolders = [...folder.folders.values()].sort((a, b) => compare(a.name, b.name));
    for (const sub of subfolders) {
      // Compact chains of folders that only contain one folder.
      let label = sub.name;
      let node = sub;
      while (node.files.length === 0 && node.folders.size === 1) {
        node = node.folders.values().next().value!;
        label += `/${node.name}`;
      }
      const key = `${path}/${label}`;
      const expanded = filtering || !collapsed.has(key);
      rows.push({ type: 'folder', key, label, depth, expanded, count: node.count });
      if (expanded) walk(node, key, depth + 1);
    }
    const files = folder.files.sort((a, b) => KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] || compare(a.file, b.file));
    for (const { entry, file } of files) rows.push({ type: 'file', key: `${path}${FILE_KEY_SEPARATOR}${entry.url}`, label: file, depth, entry });
  };

  const origins = [...byOrigin.entries()].sort(([a], [b]) => compare(a, b));
  for (const [origin, root] of origins) {
    const key = origin;
    const expanded = filtering || !collapsed.has(key);
    rows.push({ type: 'origin', key, origin, label: origin.replace(WEB_SCHEME, ''), count: root.count, depth: 0, expanded });
    if (expanded) walk(root, key, 1);
  }
  return rows;
}
