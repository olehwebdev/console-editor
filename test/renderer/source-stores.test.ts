import { beforeEach, describe, expect, it } from 'vitest';
import { useTabStore, type PageTab, type SourceTab, type TabMeta } from '@/entities/editor-tab/model/store';
import { MAX_KNOWN_BUNDLES, selectLoadedSources, useSourceMapStore, type SourceMapState } from '@/entities/source-map/model/store';

const file = (id: string): TabMeta => ({ id, url: `https://a.test/${id}.js`, kind: 'Script', originalHash: null, lite: false, dirty: false, saving: false });
const source = (id: string): SourceTab => ({
  id,
  url: `webpack://app/src/${id}.ts`,
  bundleUrl: 'https://a.test/main.js',
  bundleKind: 'Script',
  languageName: 'TypeScript',
  lite: false,
  missing: false,
});
const page: PageTab = { id: 'whats-new', page: 'whats-new', title: "What's New" };
const ready = (urls: string[]): SourceMapState => ({
  status: 'ready',
  bundleHash: 'h',
  mapUrl: null,
  sources: urls.map((url) => ({ url, hasContent: true, library: false })),
  browseOnly: false,
  mismatch: false,
  checked: 0,
});

beforeEach(() => {
  useTabStore.setState({ tabs: [], sources: [], pages: [], activeId: null, diff: 'off' });
  useSourceMapStore.setState({ byBundle: {}, generation: 0 });
});

describe('source tabs', () => {
  it('opens a source tab after the file tabs and activates it, once per id', () => {
    const { add, openSource, setDiff } = useTabStore.getState();
    add(file('a'));
    setDiff('base');
    openSource(source('s'));
    openSource(source('s'));
    const s = useTabStore.getState();
    expect(s.sources.map((t) => t.id)).toEqual(['s']);
    expect(s.tabs.map((t) => t.id)).toEqual(['a']);
    expect(s.activeId).toBe('s');
    expect(s.diff).toBe('off');

    openSource(source('t'), false);
    expect(useTabStore.getState().activeId).toBe('s');
  });

  it('closing a tab hands over to its neighbour in strip order: files, sources, pages', () => {
    const { add, openSource, openPage, activate, remove } = useTabStore.getState();
    add(file('a'));
    openSource(source('s'));
    openPage(page);
    activate('s');
    remove('s');
    expect(useTabStore.getState().activeId).toBe('whats-new');
    openSource(source('t'));
    remove('whats-new');
    activate('a');
    remove('a');
    expect(useTabStore.getState().activeId).toBe('t');
    remove('t');
    expect(useTabStore.getState().activeId).toBeNull();
  });

  it('removeTabs closes file and source tabs and keeps an open page active', () => {
    const { add, openSource, openPage, removeTabs } = useTabStore.getState();
    add(file('a'));
    openSource(source('s'));
    openPage(page);
    removeTabs();
    const s = useTabStore.getState();
    expect([s.tabs, s.sources]).toEqual([[], []]);
    expect(s.activeId).toBe('whats-new');
  });
});

describe('the source-map store', () => {
  it(`keeps at most ${MAX_KNOWN_BUNDLES} bundles, dropping the oldest that are not loading`, () => {
    const { set } = useSourceMapStore.getState();
    set('b0', { status: 'loading' });
    for (let i = 1; i <= MAX_KNOWN_BUNDLES; i++) set(`b${i}`, { status: 'none', bundleHash: 'h' });
    const urls = Object.keys(useSourceMapStore.getState().byBundle);
    expect(urls).toHaveLength(MAX_KNOWN_BUNDLES);
    // b0 is still loading, so b1 (the oldest settled one) went instead.
    expect(urls).toContain('b0');
    expect(urls).not.toContain('b1');
    expect(urls.at(-1)).toBe(`b${MAX_KNOWN_BUNDLES}`);

    // Setting a known bundle again moves it to the end without dropping anything.
    set('b2', { status: 'none', bundleHash: 'h' });
    const again = Object.keys(useSourceMapStore.getState().byBundle);
    expect(again).toHaveLength(MAX_KNOWN_BUNDLES);
    expect(again.at(-1)).toBe('b2');
  });

  it('a navigation bumps the generation; markChecked records it on ready maps only', () => {
    const { set, nextGeneration, markChecked, markMismatch } = useSourceMapStore.getState();
    set('a', ready(['x']));
    set('b', { status: 'none', bundleHash: 'h' });
    nextGeneration();
    markChecked('a');
    markChecked('b');
    markMismatch('a');
    const { byBundle, generation } = useSourceMapStore.getState();
    expect(generation).toBe(1);
    expect(byBundle.a).toMatchObject({ checked: 1, mismatch: true });
    expect(byBundle.b).toEqual({ status: 'none', bundleHash: 'h' });
  });

  it('selectLoadedSources returns the same array until byBundle changes', () => {
    const { set, nextGeneration } = useSourceMapStore.getState();
    set('a', ready(['x', 'y']));
    set('b', { status: 'loading' });
    const first = selectLoadedSources(useSourceMapStore.getState());
    expect(first.map((l) => `${l.bundleUrl} ${l.source.url}`)).toEqual(['a x', 'a y']);
    nextGeneration();
    expect(selectLoadedSources(useSourceMapStore.getState())).toBe(first);
    set('c', ready(['z']));
    expect(selectLoadedSources(useSourceMapStore.getState())).toHaveLength(3);
  });
});
