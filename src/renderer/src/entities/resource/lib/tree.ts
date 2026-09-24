import type { ResourceEntry, ResourceKind } from '@common/types';
import { originOf } from '@/shared/lib';

export type ResourceRow =
  | { type: 'origin'; key: string; origin: string; label: string; count: number; depth: 0; expanded: boolean }
  | { type: 'folder'; key: string; label: string; depth: number; expanded: boolean; count: number }
  | { type: 'file'; key: string; label: string; depth: number; entry: ResourceEntry };

interface Folder {
  name: string;
  folders: Map<string, Folder>;
  files: ResourceEntry[];
}

const KIND_ORDER: Record<ResourceKind, number> = { Document: 0, Script: 1, Stylesheet: 2 };

function newFolder(name: string): Folder {
  return { name, folders: new Map(), files: [] };
}

function countFiles(folder: Folder): number {
  let n = folder.files.length;
  for (const f of folder.folders.values()) n += countFiles(f);
  return n;
}

function segmentsOf(url: string): { dirs: string[]; file: string } {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
    const file = (parts.pop() || '(index)') + u.search;
    return { dirs: parts.filter(Boolean), file };
  } catch {
    return { dirs: [], file: url };
  }
}

/** True when the query matches the file URL or the iframe it was loaded in. */
export function matchesQuery(entry: ResourceEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return entry.url.toLowerCase().includes(q) || (!!entry.frame && entry.frame.url.toLowerCase().includes(q));
}

/**
 * Flattens resources into tree rows (origin → folders → files) for a
 * virtualized list. Single-child folder chains are compacted (`static/js`) like
 * VS Code; while filtering every folder is shown expanded.
 */
export function buildResourceRows(entries: ResourceEntry[], query: string, collapsed: ReadonlySet<string>): ResourceRow[] {
  const byOrigin = new Map<string, Folder>();
  for (const entry of entries) {
    if (!matchesQuery(entry, query)) continue;
    const origin = originOf(entry.url) || entry.url;
    if (!byOrigin.has(origin)) byOrigin.set(origin, newFolder(origin));
    let folder = byOrigin.get(origin)!;
    const { dirs } = segmentsOf(entry.url);
    for (const dir of dirs) {
      if (!folder.folders.has(dir)) folder.folders.set(dir, newFolder(dir));
      folder = folder.folders.get(dir)!;
    }
    folder.files.push(entry);
  }

  const rows: ResourceRow[] = [];
  const filtering = query.length > 0;

  const walk = (folder: Folder, path: string, depth: number) => {
    const subfolders = [...folder.folders.values()].sort((a, b) => a.name.localeCompare(b.name));
    for (const sub of subfolders) {
      // Compact chains of folders that only contain one folder.
      let label = sub.name;
      let node = sub;
      while (node.files.length === 0 && node.folders.size === 1) {
        node = [...node.folders.values()][0];
        label += `/${node.name}`;
      }
      const key = `${path}/${label}`;
      const expanded = filtering || !collapsed.has(key);
      rows.push({ type: 'folder', key, label, depth, expanded, count: countFiles(node) });
      if (expanded) walk(node, key, depth + 1);
    }
    const files = [...folder.files].sort(
      (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || segmentsOf(a.url).file.localeCompare(segmentsOf(b.url).file),
    );
    for (const entry of files) rows.push({ type: 'file', key: `${path}\u0000${entry.url}`, label: segmentsOf(entry.url).file, depth, entry });
  };

  const origins = [...byOrigin.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [origin, root] of origins) {
    const key = origin;
    const expanded = filtering || !collapsed.has(key);
    rows.push({ type: 'origin', key, origin, label: origin.replace(/^https?:\/\//, ''), count: countFiles(root), depth: 0, expanded });
    if (expanded) walk(root, key, 1);
  }
  return rows;
}

/** Tooltip text describing where a file was loaded. */
export function describeFrame(entry: ResourceEntry): string | null {
  if (!entry.frame) return null;
  const where = entry.frame.url.replace(/^https?:\/\//, '') || 'an iframe';
  if (entry.kind === 'Document' && entry.frame.url === entry.url) return `Document of ${entry.frame.depth > 1 ? 'a nested iframe' : 'an iframe'}`;
  return `Loaded in ${entry.frame.depth > 1 ? 'nested iframe' : 'iframe'} ${where}`;
}
