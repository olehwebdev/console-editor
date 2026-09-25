import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OverrideMeta, ResourceContent, ResourceEntry, SourceMapFile, SourceMapRequest } from '../../src/shared/types';
import type { LoadedMaps } from '@/shared/lib/source-map/host';
import { disposeTabModel, getTabModel, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { useResourceStore } from '@/entities/resource';
import { bundleNestKey, useSourceMapStore } from '@/entities/source-map';
import { closeTab } from '@/features/close-tab';
import { showBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import {
  ensureSourceMap,
  forgetSourceMaps,
  goToBundle,
  goToOriginal,
  jumpToMappedCode,
  openOriginalSource,
  reloadSourceMap,
  revealBundleSources,
  toggleBundleSources,
  useSourceTree,
} from '@/features/open-resource';
import { saveTab } from '@/features/save-override';
import { askSourceMapWorker, stopSourceMapWorker } from '@/shared/lib';
import { MAIN_JS, MAIN_JS_MAP, MAIN_JS_SOURCES, MAIN_SOURCE } from '../fixtures/sourceMaps';

/** Just enough of a Monaco text model: text, positions, a version, change listeners. */
const { FakeModel } = vi.hoisted(() => {
  let models = 0;
  class FakeModel {
    readonly id = `model-${++models}`;
    disposed = false;
    private version = 1;
    private listeners = new Set<() => void>();
    constructor(
      private text: string,
      readonly language: string,
      readonly uri: { authority: string; path: string },
    ) {}
    getValue() {
      return this.text;
    }
    getValueLength() {
      return this.text.length;
    }
    getAlternativeVersionId() {
      return this.version;
    }
    getOffsetAt({ lineNumber, column }: { lineNumber: number; column: number }) {
      const lines = this.text.split('\n');
      let offset = 0;
      for (let i = 0; i < lineNumber - 1; i++) offset += lines[i]!.length + 1;
      return offset + column - 1;
    }
    getPositionAt(offset: number) {
      const before = this.text.slice(0, offset).split('\n');
      return { lineNumber: before.length, column: before.at(-1)!.length + 1 };
    }
    /** Stands in for the user typing. */
    type(text: string) {
      this.text = text;
      this.version++;
      this.listeners.forEach((l) => l());
    }
    onDidChangeContent(listener: () => void) {
      this.listeners.add(listener);
      return { dispose: () => this.listeners.delete(listener) };
    }
    isDisposed() {
      return this.disposed;
    }
    dispose() {
      this.disposed = true;
    }
  }
  return { FakeModel };
});

const api = vi.hoisted(() => ({
  getSourceMap: vi.fn<(request: SourceMapRequest) => Promise<SourceMapFile>>(),
  getResourceContent: vi.fn<(url: string) => Promise<ResourceContent>>(),
  getOverride: vi.fn(),
  getOverrideBase: vi.fn(),
  createOverride: vi.fn(),
  updateOverride: vi.fn(),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn((_options: object) => 'toast-1'), { dismiss: vi.fn(), update: vi.fn() }));
const confirm = vi.hoisted(() => vi.fn(async () => true));
const reveal = vi.hoisted(() => vi.fn());
/** The editor showing a model, with the cursor at `position`, or none. */
const editor = vi.hoisted(() => ({ current: null as { getModel(): unknown; getPosition(): unknown } | null }));
const worker = vi.hoisted(() => ({ maps: new Map() as LoadedMaps }));

vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => String(err) }));
vi.mock('@/shared/ui/toast', () => ({ toast }));
vi.mock('@/shared/ui/dialog', () => ({ confirm, isConfirmOpen: () => false }));
vi.mock('@/shared/monaco', async () => {
  const { languageForPath } = await import('@/shared/monaco/languages/languageForPath');
  return {
    monaco: { editor: { createModel: (text: string, language: string, uri: never) => new FakeModel(text, language, uri) }, Uri: { from: (parts: object) => parts } },
    languageFor: () => 'javascript',
    languageForPath,
    READ_ONLY_URI_AUTHORITY: 'source',
    requestReveal: reveal,
    getActiveEditor: () => editor.current,
    editorHasFocus: () => false,
    dismissEditorWidgets: () => {},
    triggerInActiveEditor: () => {},
  };
});
// The worker runs in this thread, and pretty-printing too (as the format worker does it).
vi.mock('@/shared/lib', async (importOriginal) => {
  const { handleSourceMapRequest } = await import('@/shared/lib/source-map/host');
  const { BEAUTIFY_OPTIONS } = await import('@/shared/lib/format/constants');
  const { default: beautify } = await import('js-beautify');
  return {
    ...(await importOriginal<object>()),
    askSourceMapWorker: vi.fn(async (request: never) => handleSourceMapRequest(worker.maps, request)),
    stopSourceMapWorker: vi.fn(() => worker.maps.clear()),
    formatCode: async (text: string, kind: string) => (kind === 'Stylesheet' ? beautify.css : beautify.js)(text, BEAUTIFY_OPTIONS),
  };
});

type Model = InstanceType<typeof FakeModel>;
const model = (id: string | null | undefined) => getTabModel(id ?? null) as unknown as Model;
const tick = () => new Promise((r) => setTimeout(r, 0));

const BUNDLE_URL = 'https://site.test/static/js/main.3f9a1c2b.js';
const BUNDLE = 'main.3f9a1c2b.js';
const MAP_URL = `${BUNDLE_URL}.map`;
const HASH = 'a'.repeat(64);
/** Where the map's sources resolve: `./` dropped, as URL parsing does. */
const urlOf = (source: number) => MAIN_JS_SOURCES[source]!.url.replace('/./', '/');
const LIB_URL = urlOf(MAIN_SOURCE.lib);
const MAIN_URL = urlOf(MAIN_SOURCE.main);
const BOOTSTRAP_URL = urlOf(MAIN_SOURCE.bootstrap);

const found = (bundle: string | null = MAIN_JS): SourceMapFile => ({
  status: 'found',
  bundleHash: HASH,
  bundle,
  mapUrl: MAP_URL,
  map: { type: 'bytes', bytes: new TextEncoder().encode(MAIN_JS_MAP) },
});
const resource = (url: string, overrideId?: string): ResourceEntry => ({ url, kind: 'Script', mimeType: 'text/javascript', status: 200, overrideId });
const toasted = () => toast.mock.calls.map(([options]) => options as { title: string; description?: string; action?: { label: string; onClick(): void } });
const lastToast = () => toasted().at(-1);
const bundleTab = () => useTabStore.getState().tabs.find((t) => t.url === BUNDLE_URL);
const sourceTab = (url: string) => useTabStore.getState().sources.find((t) => t.url === url);
const sentTo = (type: string) => vi.mocked(askSourceMapWorker).mock.calls.map(([request]) => request).filter((request) => request.type === type);
/** Puts the cursor of the active editor at `lineNumber` of `m`'s text, on its first character that isn't indentation. */
function cursorAt(m: Model, lineNumber: number) {
  const column = m.getValue().split('\n')[lineNumber - 1]!.search(/\S/) + 1;
  editor.current = { getModel: () => m, getPosition: () => ({ lineNumber, column }) };
}
/** The text of `m` from the position `reveal` was last asked to show it at. */
function revealedText(m: Model) {
  const [shown, position] = reveal.mock.calls.at(-1) as [Model, { lineNumber: number; column: number }];
  expect(shown).toBe(m);
  return m.getValue().slice(m.getOffsetAt(position));
}

async function openBundle() {
  const { openResource } = await import('@/features/open-resource');
  const id = await openResource(BUNDLE_URL);
  return model(id);
}

beforeEach(() => {
  vi.clearAllMocks();
  forgetSourceMaps();
  const { tabs, sources } = useTabStore.getState();
  for (const t of [...tabs, ...sources]) disposeTabModel(t.id);
  useTabStore.setState({ tabs: [], sources: [], pages: [], activeId: null, diff: 'off' });
  useResourceStore.getState().apply([{ type: 'reset' }, { type: 'add', entry: resource(BUNDLE_URL) }]);
  useOverrideStore.getState().setAll([]);
  editor.current = null;
  api.getSourceMap.mockImplementation(async () => found());
  api.getResourceContent.mockImplementation(async (url) => ({ url, content: MAIN_JS, hash: 'h-live' }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loading a bundle’s map', () => {
  it('asks main once however many ask, and answers from the store until the page loads again', async () => {
    const [a, b] = await Promise.all([ensureSourceMap(BUNDLE_URL, 'Script'), ensureSourceMap(BUNDLE_URL, 'Script')]);
    expect(a).toBe(b);
    expect(a).toMatchObject({ status: 'ready', bundleHash: HASH, mapUrl: MAP_URL, browseOnly: false, mismatch: false });
    expect(a.status === 'ready' && a.sources.map((s) => [s.url, s.hasContent, s.library])).toEqual([
      [LIB_URL, true, false],
      [urlOf(MAIN_SOURCE.dom), true, false],
      [urlOf(MAIN_SOURCE.store), true, false],
      [MAIN_URL, true, false],
      [BOOTSTRAP_URL, false, true],
    ]);
    await ensureSourceMap(BUNDLE_URL, 'Script');
    expect(api.getSourceMap).toHaveBeenCalledExactlyOnceWith({ bundleUrl: BUNDLE_URL, kind: 'Script' });
  });

  it('checks a map again after a page load, keeping it shown, and keeps it when main answers unchanged', async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    useSourceMapStore.getState().nextGeneration();
    api.getSourceMap.mockResolvedValueOnce({ status: 'unchanged' });

    const checking = ensureSourceMap(BUNDLE_URL, 'Script');
    expect(useSourceMapStore.getState().byBundle[BUNDLE_URL]?.status).toBe('ready');
    const state = await checking;

    expect(api.getSourceMap).toHaveBeenLastCalledWith({ bundleUrl: BUNDLE_URL, kind: 'Script', known: { bundleHash: HASH, mapUrl: MAP_URL } });
    expect(state).toMatchObject({ status: 'ready', checked: useSourceMapStore.getState().generation });
    expect(useSourceMapStore.getState().byBundle[BUNDLE_URL]).toBe(state);
  });

  it('remembers a file without a map until asked to look again, and says so', async () => {
    api.getSourceMap.mockResolvedValue({ status: 'none', bundleHash: HASH });
    expect(await ensureSourceMap(BUNDLE_URL, 'Script')).toEqual({ status: 'none', bundleHash: HASH });
    await ensureSourceMap(BUNDLE_URL, 'Script');
    expect(api.getSourceMap).toHaveBeenCalledTimes(1);

    await reloadSourceMap(BUNDLE_URL, 'Script');
    expect(api.getSourceMap).toHaveBeenCalledTimes(2);
    expect(lastToast()).toMatchObject({ title: `${BUNDLE} has no source map` });
  });

  it('says why a map failed, with a retry that looks again', async () => {
    api.getSourceMap.mockResolvedValueOnce({ status: 'failed', failure: 'http', detail: '404', mapUrl: MAP_URL });
    await reloadSourceMap(BUNDLE_URL, 'Script');
    expect(lastToast()).toMatchObject({ title: `Couldn't read the source map of ${BUNDLE}`, description: expect.stringContaining('HTTP 404'), action: { label: 'Retry' } });

    lastToast()!.action!.onClick();
    await vi.waitFor(() => expect(useSourceMapStore.getState().byBundle[BUNDLE_URL]?.status).toBe('ready'));
  });

  it('says so when the worker cannot read the map', async () => {
    api.getSourceMap.mockResolvedValueOnce({ ...found(), map: { type: 'bytes', bytes: new TextEncoder().encode('<!doctype html>') } } as SourceMapFile);
    expect(await ensureSourceMap(BUNDLE_URL, 'Script')).toMatchObject({ status: 'failed', failure: 'not-a-map', mapUrl: MAP_URL });
  });

  it('drops the answer of a load that was in flight when the maps were forgotten', async () => {
    let answer!: (file: SourceMapFile) => void;
    api.getSourceMap.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const load = ensureSourceMap(BUNDLE_URL, 'Script');
    forgetSourceMaps();
    answer(found());
    await load;
    expect(useSourceMapStore.getState().byBundle).toEqual({});
    expect(stopSourceMapWorker).toHaveBeenCalled();
  });
});

describe('original files', () => {
  it('open read-only, once, apart from the file tabs', async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const id = await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL);

    const { tabs, sources, activeId } = useTabStore.getState();
    expect(tabs).toEqual([]);
    expect(sources).toEqual([{ id, url: LIB_URL, bundleUrl: BUNDLE_URL, bundleKind: 'Script', languageName: 'TypeScript', lite: false, missing: false }]);
    expect(activeId).toBe(id);
    expect(model(id).getValue()).toBe(MAIN_JS_SOURCES[MAIN_SOURCE.lib]!.content);
    expect(model(id).uri).toMatchObject({ authority: 'source', path: `/${id}/lib.ts` });
    expect(model(id).language).toBe('typescript');

    // A second open, even while the first runs, makes no second tab.
    expect(await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL)).toBe(id);
    const [first, second] = await Promise.all([
      openOriginalSource(BUNDLE_URL, 'Script', MAIN_URL),
      openOriginalSource(BUNDLE_URL, 'Script', MAIN_URL),
    ]);
    expect(second).toBeNull();
    expect(useTabStore.getState().sources.map((t) => t.id)).toEqual([id, first]);
  });

  it('open as a tab that says so when the map lacks their text; a jump there says so instead', async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const id = await openOriginalSource(BUNDLE_URL, 'Script', BOOTSTRAP_URL);
    expect(sourceTab(BOOTSTRAP_URL)).toMatchObject({ id, missing: true, languageName: 'Plain text' });
    expect(getTabModel(id)).toBeNull();

    useTabStore.getState().remove(id!);
    expect(await openOriginalSource(BUNDLE_URL, 'Script', BOOTSTRAP_URL, { reveal: { lineNumber: 1, column: 1 } })).toBeNull();
    expect(lastToast()).toMatchObject({ title: 'Maps to bootstrap line 1', description: expect.stringContaining("doesn't include") });
    expect(useTabStore.getState().sources).toEqual([]);
  });

  it('are never saved, formatted or diffed, and close without asking', async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const id = (await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL))!;
    const text = model(id).getValue();
    toast.mockClear();

    await saveTab(id);
    await formatTab(id);
    await showBaseDiff(id);
    expect(api.createOverride).not.toHaveBeenCalled();
    expect(api.updateOverride).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(useTabStore.getState().diff).toBe('off');
    expect(model(id).getValue()).toBe(text);

    const shown = model(id);
    await closeTab(id);
    expect(confirm).not.toHaveBeenCalled();
    expect(useTabStore.getState().sources).toEqual([]);
    await tick();
    expect(shown.disposed).toBe(true);
    expect(getTabModel(id)).toBeNull();
  });
});

describe('jumping from an original to the bundle', () => {
  it('opens the pretty-printed bundle at the line, revealed before the tab shows', async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const libId = (await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL))!;
    const shownWhenRevealed: (string | null)[] = [];
    reveal.mockImplementation(() => shownWhenRevealed.push(useTabStore.getState().activeId));

    await goToBundle(libId, 3);

    const bundle = model(bundleTab()!.id);
    expect(bundle.getValue()).not.toBe(MAIN_JS);
    expect(reveal).toHaveBeenLastCalledWith(bundle, { lineNumber: 5, column: 5 });
    expect(revealedText(bundle)).toMatch(/^greet: function/);
    expect(shownWhenRevealed.at(-1)).toBe(libId);
    expect(useTabStore.getState().activeId).toBe(bundleTab()!.id);
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining('has no code') }));
  });

  it("uses the cursor's line, and sends the bundle's text only when the worker asks for it", async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const libId = (await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL))!;
    cursorAt(model(libId), 6);

    await goToBundle();
    const bundle = model(bundleTab()!.id);
    expect(revealedText(bundle)).toMatch(/^sum: function/);
    expect(sentTo('toView').map((request) => 'text' in (request as { view: object }).view)).toEqual([false, true]);

    useTabStore.getState().activate(libId);
    await goToBundle(libId, 3);
    expect(revealedText(bundle)).toMatch(/^greet: function/);
    // The same version of the tab: lined up already.
    expect(sentTo('toView')).toHaveLength(3);
  });

  it('goes to the next line with code from a comment, and says so', async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const mainId = (await openOriginalSource(BUNDLE_URL, 'Script', MAIN_URL))!;
    await goToBundle(mainId, 11);
    expect(revealedText(model(bundleTab()!.id))).toMatch(/^var n = document\.querySelector\("#main"\)/);
    expect(lastToast()).toEqual({ title: 'Line 11 of main.ts has no code in the bundle', description: "Showing line 12's.", tone: 'neutral' });
  });

  it('lands where your edits start when the line is inside them', async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const libId = (await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL))!;
    const bundle = await openBundle();
    bundle.type(bundle.getValue().replace('greet: function', 'hello: function'));
    expect(bundleTab()!.dirty).toBe(true);

    useTabStore.getState().activate(libId);
    await goToBundle(libId, 3);
    expect(revealedText(bundle)).toMatch(/^hello: function/);
    expect(lastToast()).toMatchObject({ title: `You've edited this part of ${BUNDLE}`, tone: 'warning' });
  });

  it('loads a map the worker dropped again, once', async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const libId = (await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL))!;
    worker.maps.clear();

    await goToBundle(libId, 3);
    expect(api.getSourceMap).toHaveBeenCalledTimes(2);
    expect(revealedText(model(bundleTab()!.id))).toMatch(/^greet: function/);
  });

  it('ignores a second jump while one runs', async () => {
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const libId = (await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL))!;
    const first = goToBundle(libId, 3);
    await goToBundle(libId, 6);
    await first;
    expect(reveal).toHaveBeenCalledTimes(1);
    expect(revealedText(model(bundleTab()!.id))).toMatch(/^greet: function/);
  });

  it('says a bundle too large to line up can only be browsed', async () => {
    api.getSourceMap.mockResolvedValueOnce(found(null));
    expect(await ensureSourceMap(BUNDLE_URL, 'Script')).toMatchObject({ status: 'ready', browseOnly: true });
    const libId = (await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL))!;
    await goToBundle(libId, 3);
    expect(lastToast()).toMatchObject({ title: `${BUNDLE} is too large to line up with its source map` });
    expect(bundleTab()).toBeUndefined();
  });
});

describe('jumping from the bundle to an original', () => {
  it('opens the original at the line the cursor’s code came from, reading the map first', async () => {
    const bundle = await openBundle();
    cursorAt(bundle, 72);
    await goToOriginal();

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: `Reading the source map of ${BUNDLE}…` }));
    expect(toast.dismiss).toHaveBeenCalled();
    const main = sourceTab(MAIN_URL)!;
    expect(useTabStore.getState().activeId).toBe(main.id);
    expect(reveal).toHaveBeenLastCalledWith(model(main.id), { lineNumber: 10, column: 1 });

    useTabStore.getState().activate(bundleTab()!.id);
    cursorAt(bundle, 8);
    await goToOriginal();
    expect(reveal).toHaveBeenLastCalledWith(model(sourceTab(LIB_URL)!.id), { lineNumber: 6, column: 3 });
  });

  it('switches to an original already open, moving its cursor', async () => {
    const bundle = await openBundle();
    await ensureSourceMap(BUNDLE_URL, 'Script');
    const libId = (await openOriginalSource(BUNDLE_URL, 'Script', LIB_URL, { activate: false }))!;
    cursorAt(bundle, 21);
    await goToOriginal(bundleTab()!.id);
    expect(useTabStore.getState().sources).toHaveLength(1);
    expect(useTabStore.getState().activeId).toBe(libId);
    expect(reveal).toHaveBeenLastCalledWith(model(libId), { lineNumber: 15, column: 7 });
  });

  it('says code you added has no original', async () => {
    const bundle = await openBundle();
    bundle.type(bundle.getValue().replace('greet: function', 'hello: function'));
    cursorAt(bundle, 5);
    await goToOriginal();
    expect(lastToast()).toMatchObject({ title: 'This is code you changed' });
    expect(useTabStore.getState().sources).toEqual([]);
  });

  it('says the file changed when a new build differs from what the map describes', async () => {
    api.getResourceContent.mockResolvedValueOnce({ url: BUNDLE_URL, content: MAIN_JS.replace('greet:function', 'hello:function'), hash: 'h-new' });
    const bundle = await openBundle();
    cursorAt(bundle, 5);
    await goToOriginal();
    expect(lastToast()).toMatchObject({ title: `${BUNDLE} changed since its source map was loaded` });
  });

  it("says so for the bundler's own code, whose file the map has no text for", async () => {
    const bundle = await openBundle();
    // `"use strict"` of webpack's bootstrap.
    cursorAt(bundle, 2);
    await goToOriginal();
    expect(lastToast()).toMatchObject({ title: 'Maps to bootstrap line 1' });
    expect(useTabStore.getState().sources).toEqual([]);
  });

  it("uses the map of the file an override replaced, even under another file's name", async () => {
    const override: OverrideMeta = {
      id: 'o1',
      kind: 'Script',
      sourceUrl: 'https://site.test/static/js/main.00000000.js',
      match: { type: 'glob', pattern: 'https://site.test/static/js/main.*.js', ignoreQuery: false },
      enabled: true,
      originalHash: null,
      createdAt: 0,
      updatedAt: 0,
    };
    useOverrideStore.getState().setAll([override]);
    useResourceStore.getState().apply([{ type: 'reset' }, { type: 'add', entry: resource(BUNDLE_URL, 'o1') }]);
    api.getOverride.mockResolvedValue({ ...override, content: MAIN_JS });

    const bundle = await openBundle();
    // The override's tab, named after the file it was made from.
    const [tab] = useTabStore.getState().tabs;
    expect(tab).toMatchObject({ overrideId: 'o1', url: override.sourceUrl });
    editor.current = { getModel: () => bundle, getPosition: () => bundle.getPositionAt(MAIN_JS.indexOf('sum:function')) };
    await goToOriginal(tab!.id);

    expect(api.getSourceMap).toHaveBeenCalledWith({ bundleUrl: BUNDLE_URL, kind: 'Script' });
    expect(reveal).toHaveBeenLastCalledWith(model(sourceTab(LIB_URL)!.id), { lineNumber: 6, column: 3 });
  });
});

describe('the one shortcut', () => {
  it('goes to the bundle from an original, to the original from a bundle, and explains itself elsewhere', async () => {
    const bundle = await openBundle();
    cursorAt(bundle, 5);
    await jumpToMappedCode();
    const lib = sourceTab(LIB_URL)!;
    expect(useTabStore.getState().activeId).toBe(lib.id);

    cursorAt(model(lib.id), 6);
    await jumpToMappedCode();
    expect(useTabStore.getState().activeId).toBe(bundleTab()!.id);
    expect(revealedText(bundle)).toMatch(/^sum: function/);

    useTabStore.getState().add({ id: 'page', url: 'https://site.test/', kind: 'Document', originalHash: null, lite: false, dirty: false, saving: false });
    await jumpToMappedCode();
    expect(lastToast()).toMatchObject({ title: 'Only scripts and stylesheets have source maps' });
  });
});

describe("a bundle's originals in the Explorer", () => {
  it('open when their map loads, and close again with a toast when there is none', async () => {
    const key = bundleNestKey(BUNDLE_URL);
    await toggleBundleSources(BUNDLE_URL, 'Script');
    expect(useSourceTree.getState().toggled.has(key)).toBe(true);
    expect(useSourceMapStore.getState().byBundle[BUNDLE_URL]?.status).toBe('ready');
    await toggleBundleSources(BUNDLE_URL, 'Script');
    expect(useSourceTree.getState().toggled.has(key)).toBe(false);
    expect(api.getSourceMap).toHaveBeenCalledTimes(1);

    const other = 'https://site.test/plain.js';
    api.getSourceMap.mockResolvedValueOnce({ status: 'none', bundleHash: HASH });
    await revealBundleSources(other, 'Script');
    expect(useSourceTree.getState().toggled.has(bundleNestKey(other))).toBe(false);
    expect(useSourceTree.getState().reveal).toMatchObject({ bundleUrl: other });
    expect(lastToast()).toMatchObject({ title: 'plain.js has no source map' });
  });

  it('are shown loading while their map downloads', async () => {
    let answer!: (file: SourceMapFile) => void;
    api.getSourceMap.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const opening = revealBundleSources(BUNDLE_URL, 'Script');
    expect(useSourceMapStore.getState().byBundle[BUNDLE_URL]).toEqual({ status: 'loading' });
    const first = useSourceTree.getState().reveal!.token;
    void revealBundleSources(BUNDLE_URL, 'Script');
    expect(useSourceTree.getState().reveal!.token).toBe(first + 1);
    answer(found());
    await opening;
    expect(api.getSourceMap).toHaveBeenCalledTimes(1);
    expect(useSourceMapStore.getState().byBundle[BUNDLE_URL]?.status).toBe('ready');
  });
});
