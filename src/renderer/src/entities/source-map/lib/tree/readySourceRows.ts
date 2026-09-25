import type { SourceMapState } from '../../model/store';
import { SOURCE_KEY_SEPARATOR as SEP } from '../constants';
import { KEY_TAG, WEB_SCHEME } from './constants';
import { matchesSource } from './matchesSource';
import { sourceHierarchy } from './sourceHierarchy';
import { statusRow } from './statusRow';
import type { NestInput, SourceFolder, SourceRow } from './types';

/** Same order as `localeCompare`, without its per-call setup. */
const { compare } = new Intl.Collator();

/**
 * The originals of a loaded map: a row per root only when there are several, folders (single-child
 * chains compacted) before files, then library code in a group of its own, closed by default.
 */
export function readySourceRows(state: Extract<SourceMapState, { status: 'ready' }>, input: NestInput): SourceRow[] {
  const { bundleUrl, bundleKind, parentKey, depth, isOpen, query } = input;
  const filtering = query.length > 0;
  const sources = filtering ? state.sources.filter((source) => matchesSource(source.url, query)) : state.sources;
  if (!sources.length) return statusRow(input, 'empty', filtering ? `No original files match “${query}”` : 'The source map lists no original files');
  const { authored, libraries, libraryCount } = sourceHierarchy(sources);
  const open = (key: string, byDefault: boolean) => filtering || isOpen(key, byDefault);
  const rows: SourceRow[] = [];

  const walk = (folder: SourceFolder, key: string, level: number) => {
    for (const sub of [...folder.folders.values()].sort((a, b) => compare(a.name, b.name))) {
      const names = [sub.name];
      let node = sub;
      while (node.files.length === 0 && node.folders.size === 1) {
        node = node.folders.values().next().value!;
        names.push(node.name);
      }
      const subKey = key + names.map((name) => `${SEP}${KEY_TAG.dir}${SEP}${name}`).join('');
      const label = names.join('/');
      const expanded = open(subKey, true);
      rows.push({ type: 'source-folder', key: subKey, depth: level, label, title: label, count: node.count, expanded, variant: 'folder', bundleUrl });
      if (expanded) walk(node, subKey, level + 1);
    }
    for (const { source, label } of [...folder.files].sort((a, b) => compare(a.label, b.label))) {
      rows.push({ type: 'source', key: `${key}${SEP}${KEY_TAG.source}${SEP}${source.url}`, depth: level, label, bundleUrl, bundleKind, source });
    }
  };

  const addRoots = (roots: Map<string, SourceFolder>, key: string, level: number) => {
    // Sorted as shown: web origins without their scheme.
    const sorted = [...roots.values()]
      .map((folder) => {
        const title = folder.name || 'Sources without a URL';
        return { folder, title, label: title.replace(WEB_SCHEME, '') };
      })
      .sort((a, b) => compare(a.label, b.label));
    for (const { folder, title, label } of sorted) {
      const rootKey = `${key}${SEP}${KEY_TAG.root}${SEP}${folder.name}`;
      // One root says nothing the bundle row doesn't: its folders go straight under the bundle.
      if (sorted.length === 1) return walk(folder, rootKey, level);
      const expanded = open(rootKey, true);
      rows.push({ type: 'source-folder', key: rootKey, depth: level, label, title, count: folder.count, expanded, variant: WEB_SCHEME.test(folder.name) ? 'origin' : 'root', bundleUrl });
      if (expanded) walk(folder, rootKey, level + 1);
    }
  };

  addRoots(authored, parentKey, depth);
  if (libraryCount) {
    const key = `${parentKey}${SEP}${KEY_TAG.library}`;
    const expanded = open(key, false);
    rows.push({ type: 'source-folder', key, depth, label: 'Libraries', title: 'Third-party code: ignore-listed by the build, or under node_modules', count: libraryCount, expanded, variant: 'library', bundleUrl });
    if (expanded) addRoots(libraries, key, depth + 1);
  }
  return rows;
}
