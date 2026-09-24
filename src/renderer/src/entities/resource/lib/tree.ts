import type { ResourceEntry, ResourceKind } from '@common/types';

export type ResourceRow =
  | { type: 'origin'; key: string; origin: string; label: string; count: number; depth: 0; expanded: boolean }
  | { type: 'folder'; key: string; label: string; depth: number; expanded: boolean; count: number }
  | { type: 'file'; key: string; label: string; depth: number; entry: ResourceEntry };

interface ParsedUrl {
  origin: string;
  dirs: string[];
  /** Last path segment plus the query: the row label and sort key. */
  file: string;
}

interface Folder {
  name: string;
  folders: Map<string, Folder>;
  files: { entry: ResourceEntry; file: string }[];
  /** Files in this folder and below. */
  count: number;
}

const KIND_ORDER: Record<ResourceKind, number> = { Document: 0, Script: 1, Stylesheet: 2 };
/** Same order as `localeCompare`, without its per-call setup. */
const { compare } = new Intl.Collator();

function subfolder(folders: Map<string, Folder>, name: string): Folder {
  let folder = folders.get(name);
  if (!folder) {
    folder = { name, folders: new Map(), files: [], count: 0 };
    folders.set(name, folder);
  }
  return folder;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function parseUrl(url: string): ParsedUrl {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').map(decodeSegment);
    const file = (parts.pop() || '(index)') + u.search;
    return { origin: u.origin || url, dirs: parts.filter(Boolean), file };
  } catch {
    return { origin: url, dirs: [], file: url };
  }
}

/** Each URL is parsed once, not on every rebuild of the tree (the page reports thousands). */
const parsedUrls = new Map<string, ParsedUrl>();
const PARSED_URLS_MAX = 20_000;

function parsed(url: string): ParsedUrl {
  let p = parsedUrls.get(url);
  if (!p) {
    if (parsedUrls.size >= PARSED_URLS_MAX) parsedUrls.clear();
    p = parseUrl(url);
    parsedUrls.set(url, p);
  }
  return p;
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
    for (const { entry, file } of files) rows.push({ type: 'file', key: `${path}\u0000${entry.url}`, label: file, depth, entry });
  };

  const origins = [...byOrigin.entries()].sort(([a], [b]) => compare(a, b));
  for (const [origin, root] of origins) {
    const key = origin;
    const expanded = filtering || !collapsed.has(key);
    rows.push({ type: 'origin', key, origin, label: origin.replace(/^https?:\/\//, ''), count: root.count, depth: 0, expanded });
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
