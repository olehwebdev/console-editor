import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppEvent, CodeLocation, InspectedComponent } from '../../src/shared/types';
import { handleSourceMapRequest, type LoadedMaps } from '@/shared/lib/source-map/host';
import { nameAt } from '@/shared/lib/source-map/host/nameAt';
import { useTabStore } from '@/entities/editor-tab';
import { codeLabel, componentTitle, elementLabel, linkName, locationKey, locationsOf, useInspectorStore } from '@/entities/inspector';
import { ESBUILD_APP_JS, ESBUILD_APP_JS_MAP } from '../fixtures/esbuildApp';

const api = vi.hoisted(() => ({ startPicking: vi.fn(), stopPicking: vi.fn(), inspectComponent: vi.fn(), getSourceMap: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => (err as Error).message }));
vi.mock('@/shared/ui/toast', () => ({ toast: Object.assign(toast, { dismiss: vi.fn(), update: vi.fn() }) }));
// The tab store's model registry loads Monaco, which needs a browser; the Component page has no model.
vi.mock('@/shared/monaco', () => ({ monaco: {}, languageFor: () => 'javascript', requestReveal: vi.fn() }));

const { handleAppEvent } = await import('@/app/model/bridge');
const { pageCommands } = await import('@/app/model/bridge/commands/pageCommands');
const { inspectDepth, togglePicking } = await import('@/features/inspect/pick');

const BUNDLE_URL = 'https://site.test/assets/app.js';
const at = (column: number): CodeLocation => ({ url: BUNDLE_URL, line: 0, column });
const component = (over: Partial<InspectedComponent> = {}): InspectedComponent => ({
  pickId: '1',
  frameId: 'top',
  framework: 'react',
  build: 'production',
  element: { tag: 'button', id: 'add', classes: ['primary', 'wide'] },
  chain: [
    { name: 'Sd', key: 'A1', location: at(10) },
    { name: 'l2', key: null, location: at(20) },
  ],
  depth: 0,
  props: [{ name: 'onRemove', preview: 'ƒ e', location: at(20) }],
  state: [],
  context: [],
  handlers: [{ name: 'onClick', function: 'e', location: at(30) }],
  ...over,
});
const place = (name: string | null) => ({ bundleUrl: BUNDLE_URL, url: 'https://site.test/src/CartItem.tsx', line: 11, column: 1, name, rawOffset: 5 });

describe('where a picked function comes from (the source-map worker)', () => {
  let maps: LoadedMaps;
  const load = (map: string) => handleSourceMapRequest(maps, { type: 'load', bundleUrl: BUNDLE_URL, mapUrl: `${BUNDLE_URL}.map`, bundle: ESBUILD_APP_JS, map: { type: 'bytes', bytes: new TextEncoder().encode(map) } });
  const toCents = ESBUILD_APP_JS.indexOf('function f(');

  beforeEach(() => {
    maps = new Map();
  });

  it("maps a place in the bundle as served to its original, with the map's name for the function and where it is in the raw bundle", () => {
    load(ESBUILD_APP_JS_MAP);
    expect(handleSourceMapRequest(maps, { type: 'toOriginalRaw', bundleUrl: BUNDLE_URL, line: 0, column: toCents })).toEqual({
      url: 'https://site.test/src/money.ts',
      line: 8,
      // `function` after `export `, 1-based.
      column: 8,
      name: 'toCents',
      rawOffset: toCents,
      mismatch: false,
    });
  });

  it("reads the name off the original's text when the map has no names (Vite's minifier writes none)", () => {
    load(JSON.stringify({ ...JSON.parse(ESBUILD_APP_JS_MAP), names: [] }));
    expect(handleSourceMapRequest(maps, { type: 'toOriginalRaw', bundleUrl: BUNDLE_URL, line: 0, column: toCents })).toMatchObject({ line: 8, name: 'toCents' });
  });

  it('says when the bundle has no map loaded', () => {
    expect(handleSourceMapRequest(maps, { type: 'toOriginalRaw', bundleUrl: BUNDLE_URL, line: 0, column: 0 })).toEqual({ miss: 'unloaded' });
  });

  it("reads a function's name where its definition starts, in each way code names one", () => {
    const named = (line: string, column: number) => nameAt(`// first\n${line}\n`, 2, column);
    expect(named('export default async function* Feed(', 0)).toBe('Feed');
    expect(named('export class CartStore {', 0)).toBe('CartStore');
    expect(named('  static async load(id) {', 2)).toBe('load');
    expect(named('  get total() {', 2)).toBe('total');
    // An arrow's place is its parameters: the name is before it.
    expect(named('const handleAdd = (event) => {', 18)).toBe('handleAdd');
    expect(named('export const Row: FC<Props> = async ({ id }) =>', 30)).toBe('Row');
    expect(named('  onRemove: () => remove(id),', 12)).toBe('onRemove');
    expect(named('if (open) {', 0)).toBeNull();
    expect(named('function (a) {', 0)).toBeNull();
    expect(nameAt('one line', 3, 0)).toBeNull();
    expect(nameAt(null, 1, 0)).toBeNull();
  });
});

describe('picked components (entities/inspector)', () => {
  beforeEach(() => {
    useInspectorStore.setState({ picking: false, hover: null, component: null, origins: {} });
    useTabStore.setState({ tabs: [], sources: [], pages: [], activeId: null });
    vi.clearAllMocks();
  });

  it("names a React component by its original's name once known, and keeps Vue's own name", () => {
    const origins = { [locationKey(at(10))]: place('CartItem') };
    expect(linkName(component().chain[0]!, 'react', origins)).toBe('CartItem');
    expect(linkName(component().chain[0]!, 'vue', origins)).toBe('Sd');
    expect(linkName(component().chain[1]!, 'react', origins)).toBe('l2');
    expect(componentTitle(component(), origins)).toBe('CartItem');
    expect(componentTitle(component({ chain: [] }), origins)).toBe('<button#add.primary.wide>');
  });

  it('lists each code location a component names once, and labels one by its original once known', () => {
    expect(locationsOf(component()).map((l) => l.column)).toEqual([10, 20, 30]);
    expect(codeLabel(at(10), undefined)).toBe('app.js:1');
    expect(codeLabel(at(10), place('CartItem'))).toBe('CartItem.tsx:11');
    expect(elementLabel({ tag: 'li', id: '', classes: [] })).toBe('<li>');
  });

  it('forgets what was under the pointer when picking stops', () => {
    useInspectorStore.getState().setPicking(true);
    useInspectorStore.getState().setHover({ element: { tag: 'li', id: '', classes: [] }, framework: null, chain: [] });
    useInspectorStore.getState().setPicking(false);
    expect(useInspectorStore.getState()).toMatchObject({ picking: false, hover: null });
  });

  it('renames a page tab in place, without switching to it', () => {
    useTabStore.setState({ pages: [{ id: 'page:component', page: 'component', title: 'Sd' }, { id: 'page:stack', page: 'stack', title: 'Page stack' }], activeId: 'page:stack' });
    useTabStore.getState().retitlePage('page:component', 'CartItem');
    expect(useTabStore.getState()).toMatchObject({ pages: [{ title: 'CartItem' }, { title: 'Page stack' }], activeId: 'page:stack' });
  });

  it('starts picking, or stops it, as the main process last said', async () => {
    await togglePicking();
    useInspectorStore.getState().setPicking(true);
    await togglePicking();
    expect(api.startPicking).toHaveBeenCalledTimes(1);
    expect(api.stopPicking).toHaveBeenCalledTimes(1);
  });

  it('reads another component of the chain and shows it; says so when the page moved on', async () => {
    useInspectorStore.getState().setComponent(component());
    api.inspectComponent.mockResolvedValueOnce(component({ depth: 1 }));
    await inspectDepth(1);
    expect(api.inspectComponent).toHaveBeenCalledWith('1', 1);
    expect(useInspectorStore.getState().component?.depth).toBe(1);
    expect(useTabStore.getState().pages).toEqual([{ id: 'page:component', page: 'component', title: 'l2' }]);

    api.inspectComponent.mockRejectedValueOnce(new Error('That element is gone'));
    expect(await inspectDepth(0)).toBeNull();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't read that component", description: 'That element is gone', tone: 'danger' }));
  });

  it('follows picking from the main process, showing the Inspect view once it starts, and shows what was picked', async () => {
    const showInspect = vi.fn();
    pageCommands.current = { focusAddressBar: vi.fn(), togglePalette: vi.fn(), toggleSidebar: vi.fn(), toggleConsole: vi.fn(), showPreview: vi.fn(), showInspect };
    const emit = (event: AppEvent) => handleAppEvent(event);
    emit({ type: 'inspect-picking', picking: true });
    emit({ type: 'inspect-hover', hover: { element: { tag: 'li', id: '', classes: [] }, framework: 'react', chain: ['Sd'] } });
    expect(useInspectorStore.getState()).toMatchObject({ picking: true, hover: { chain: ['Sd'] } });
    expect(showInspect).toHaveBeenCalledTimes(1);

    // The bundle has no source map: its places stay the bundle's.
    api.getSourceMap.mockResolvedValue({ status: 'none' });
    emit({ type: 'inspect-picking', picking: false });
    emit({ type: 'inspect-picked', component: component() });
    expect(useTabStore.getState()).toMatchObject({ pages: [{ id: 'page:component', page: 'component', title: 'Sd' }], activeId: 'page:component' });
    await vi.waitFor(() => expect(Object.keys(useInspectorStore.getState().origins)).toHaveLength(3));
    expect(Object.values(useInspectorStore.getState().origins)).toEqual([null, null, null]);
    expect(showInspect).toHaveBeenCalledTimes(1);
  });
});
