import { beforeEach, describe, expect, it } from 'vitest';
import type { ResourceEntry } from '../../src/shared/types';
import {
  buildResourceRows,
  selectIframeCount,
  selectResourceCount,
  selectUniqueResources,
  useResourceStore,
  type ResourceRow,
} from '@/entities/resource';
import { treeKeyTarget, treePositions } from '@/shared/ui/tree';

const entry = (url: string, extra: Partial<ResourceEntry> = {}): ResourceEntry => ({
  url,
  kind: url.endsWith('.css') ? 'Stylesheet' : url.endsWith('.js') ? 'Script' : 'Document',
  mimeType: 'text/plain',
  status: 200,
  ...extra,
});

describe('resource store: batched changes', () => {
  beforeEach(() => useResourceStore.getState().reset());

  it('applies adds, resets and iframe drops in order, as one update', () => {
    let updates = 0;
    const off = useResourceStore.subscribe(() => updates++);
    useResourceStore.getState().apply([
      { type: 'add', entry: entry('https://old.test/a.js') },
      { type: 'reset' },
      { type: 'add', entry: entry('https://w.test/w1.js', { iframeId: 'S1' }) },
      { type: 'add', entry: entry('https://site.test/b.js') },
      { type: 'drop-iframe', iframeId: 'S1' },
      { type: 'add', entry: entry('https://w.test/w2.js', { iframeId: 'S1' }) },
    ]);
    off();
    expect(updates).toBe(1);
    expect(Object.values(useResourceStore.getState().byKey).map((e) => e.url)).toEqual(['https://site.test/b.js', 'https://w.test/w2.js']);
  });

  it('leaves the state alone for an empty batch', () => {
    const before = useResourceStore.getState();
    useResourceStore.getState().apply([]);
    expect(useResourceStore.getState()).toBe(before);
  });

  it('derives the unique list and the counts once per change (stable for selectors)', () => {
    const { addMany } = useResourceStore.getState();
    addMany([
      entry('https://cdn.test/lib.js'),
      entry('https://cdn.test/lib.js', { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } }),
      entry('https://w.test/w.js', { iframeId: 'S1', frame: { url: 'https://w.test/', depth: 1 } }),
      entry('https://x.test/x.js', { frame: { url: 'https://x.test/f.html', depth: 1 } }),
    ]);
    const state = useResourceStore.getState();
    expect(selectUniqueResources(state)).toBe(selectUniqueResources(useResourceStore.getState()));
    expect(selectResourceCount(state)).toBe(3);
    expect(selectIframeCount(state)).toBe(2);

    useResourceStore.getState().dropIframe('S1');
    expect(selectUniqueResources(useResourceStore.getState())).not.toBe(selectUniqueResources(state));
    expect(selectResourceCount(useResourceStore.getState())).toBe(2);
    expect(selectIframeCount(useResourceStore.getState())).toBe(1);
  });
});

describe('buildResourceRows', () => {
  const show = (rows: ResourceRow[]) => rows.map((r) => `${'  '.repeat(r.depth)}${r.type}:${r.label}${r.type === 'file' ? '' : ` (${r.count})`}`);

  it('counts files per folder and sorts names with the locale collation', () => {
    const rows = buildResourceRows(
      [
        entry('https://a.test/js/Zeta.js'),
        entry('https://a.test/js/alpha.js'),
        entry('https://a.test/js/%C3%A9t%C3%A9.js'),
        entry('https://a.test/js/deep/er/x.js?v=2'),
        entry('https://a.test/app.css'),
        entry('https://a.test/'),
      ],
      '',
      new Set(),
    );
    expect(show(rows)).toEqual([
      'origin:a.test (6)',
      '  folder:js (4)',
      '    folder:deep/er (1)',
      '      file:x.js?v=2',
      '    file:alpha.js',
      '    file:été.js',
      '    file:Zeta.js',
      '  file:(index)',
      '  file:app.css',
    ]);
  });

  it('returns the same rows when rebuilt (parsed URLs are cached)', () => {
    const entries = [entry('https://a.test/static/js/main.js'), entry('https://b.test/x/y.css'), entry('not a url')];
    const first = buildResourceRows(entries, '', new Set());
    expect(buildResourceRows(entries, '', new Set())).toEqual(first);
    expect(show(first)).toEqual(['origin:a.test (1)', '  folder:static/js (1)', '    file:main.js', 'origin:b.test (1)', '  folder:x (1)', '    file:y.css', 'origin:not a url (1)', '  file:not a url']);
  });
});

describe('tree keyboard navigation over the row model', () => {
  // origin (expanded) > folder (expanded) > 3 files, folder (collapsed), file; origin (collapsed)
  const rows = [
    { depth: 0, expanded: true },
    { depth: 1, expanded: true },
    { depth: 2 },
    { depth: 2 },
    { depth: 2 },
    { depth: 1, expanded: false },
    { depth: 1 },
    { depth: 0, expanded: false },
  ];

  it('moves with arrows, Home/End and pages, clamped to the list', () => {
    expect(treeKeyTarget(rows, 3, 'ArrowDown')).toBe(4);
    expect(treeKeyTarget(rows, 7, 'ArrowDown')).toBeNull();
    expect(treeKeyTarget(rows, 0, 'ArrowUp')).toBeNull();
    expect(treeKeyTarget(rows, 4, 'Home')).toBe(0);
    expect(treeKeyTarget(rows, 1, 'End')).toBe(7);
    expect(treeKeyTarget(rows, 1, 'PageDown', 3)).toBe(4);
    expect(treeKeyTarget(rows, 6, 'PageDown', 3)).toBe(7);
    expect(treeKeyTarget(rows, 2, 'PageUp', 3)).toBe(0);
  });

  it('steps to the parent or first child, and leaves folder toggling to the row', () => {
    expect(treeKeyTarget(rows, 4, 'ArrowLeft')).toBe(1);
    expect(treeKeyTarget(rows, 6, 'ArrowLeft')).toBe(0);
    expect(treeKeyTarget(rows, 5, 'ArrowLeft')).toBe(0);
    expect(treeKeyTarget(rows, 1, 'ArrowLeft')).toBeNull();
    expect(treeKeyTarget(rows, 7, 'ArrowLeft')).toBeNull();
    expect(treeKeyTarget(rows, 1, 'ArrowRight')).toBe(2);
    expect(treeKeyTarget(rows, 5, 'ArrowRight')).toBeNull();
    expect(treeKeyTarget(rows, 2, 'Enter')).toBeNull();
  });

  it('gives every row its place among its siblings', () => {
    expect(treePositions(rows).map((p) => `${p.posInSet}/${p.setSize}`)).toEqual(['1/2', '1/3', '1/3', '2/3', '3/3', '2/3', '3/3', '2/2']);
  });
});
