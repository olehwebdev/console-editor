import { beforeEach, describe, expect, it, vi } from 'vitest';
import { keyLocation, locationKey, useInspectorStore } from '@/entities/inspector';

const api = vi.hoisted(() => ({ loadSourceMapFile: vi.fn(), forgetSourceMapFile: vi.fn(), getSourceMap: vi.fn() }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api', () => ({ api, onAppEvent: () => () => {}, errorMessage: (err: unknown) => (err as Error).message }));
vi.mock('@/shared/ui/toast', () => ({ toast: Object.assign(toast, { dismiss: vi.fn(), update: vi.fn() }) }));
vi.mock('@/shared/monaco', () => ({ monaco: {}, languageFor: () => 'javascript', requestReveal: vi.fn() }));

const { forgetMapFile, forgetSourceMaps, loadMapFile, locateLocations } = await import('@/features/open-resource');
const { sourceMapMenu } = await import('@/widgets/explorer/ui/ResourceTree/sourceMapMenu');

const BUNDLE = 'https://site.test/assets/app.js';
const at = (url: string, column: number) => ({ url, line: 0, column });
const place = { bundleUrl: BUNDLE, url: 'https://site.test/src/App.tsx', line: 3, column: 1, name: 'App', rawOffset: null };

describe('source maps loaded from files (renderer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getSourceMap.mockResolvedValue({ status: 'none', bundleHash: 'h' });
    useInspectorStore.setState({
      origins: { [locationKey(at(BUNDLE, 5))]: place, [locationKey(at('https://site.test/other.js', 5))]: place },
      hookNames: { [locationKey(at(BUNDLE, 5))]: ['qty'] },
    });
  });

  it('reads a location key back, a URL with a # in it too', () => {
    const location = at('https://site.test/app.js#v2', 12);
    expect(keyLocation(locationKey(location))).toEqual(location);
    expect(keyLocation('not a key')).toBeNull();
  });

  it("forgets what was traced through a bundle's map, and nothing else", () => {
    expect(useInspectorStore.getState().forgetBundle(BUNDLE)).toEqual([at(BUNDLE, 5)]);
    expect(Object.keys(useInspectorStore.getState().origins)).toEqual([locationKey(at('https://site.test/other.js', 5))]);
    expect(useInspectorStore.getState().hookNames).toEqual({});
  });

  it('forgets every original and hook name with the maps (another workspace), and drops a lookup that finishes after', async () => {
    let answer!: (state: unknown) => void;
    api.getSourceMap.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const late = at('https://site.test/late.js', 9);
    const lookup = locateLocations([late]);
    forgetSourceMaps();
    expect(useInspectorStore.getState()).toMatchObject({ origins: {}, hookNames: {} });
    answer({ status: 'none', bundleHash: 'h' });
    await lookup;
    expect(useInspectorStore.getState().origins).toEqual({});
    // Looked up again in the new workspace, it is told.
    await locateLocations([late]);
    expect(useInspectorStore.getState().origins).toEqual({ [locationKey(late)]: null });
  });

  it('loads a map from a file, reading the bundle again and tracing its places again; nothing when none was picked', async () => {
    api.loadSourceMapFile.mockResolvedValueOnce(null);
    expect(await loadMapFile(BUNDLE)).toBe(false);
    expect(api.getSourceMap).not.toHaveBeenCalled();

    api.loadSourceMapFile.mockResolvedValueOnce({ bundleUrl: BUNDLE, name: 'app.js.map', size: 2, addedAt: 1 });
    expect(await loadMapFile(BUNDLE)).toBe(true);
    expect(api.loadSourceMapFile).toHaveBeenLastCalledWith(BUNDLE);
    // Looked for from scratch (nothing known is sent), and each place traced again: the bundle now answers no map.
    expect(api.getSourceMap).toHaveBeenCalledWith(expect.objectContaining({ bundleUrl: BUNDLE, kind: 'Script' }));
    expect(useInspectorStore.getState().origins[locationKey(at(BUNDLE, 5))]).toBeNull();
  });

  it("says so when a file can't be loaded or forgotten", async () => {
    api.loadSourceMapFile.mockRejectedValueOnce(new Error('That file is 80 MB'));
    expect(await loadMapFile(BUNDLE)).toBe(false);
    api.forgetSourceMapFile.mockRejectedValueOnce(new Error('disk full'));
    await forgetMapFile(BUNDLE);
    expect(toast.mock.calls.map(([t]) => t.title)).toEqual(["Couldn't load that source map", "Couldn't forget that source map"]);
  });

  it("offers loading a map from a file on a bundle row, and forgetting one loaded so", () => {
    const labels = (items: ReturnType<typeof sourceMapMenu>) => items.map((item) => ('label' in item ? item.label : '—'));
    expect(labels(sourceMapMenu(BUNDLE, 'Script', null))).toEqual(['Look for a source map', 'Load a source map from a file…']);
    const nest = { status: 'ready' as const, count: 3, failure: null, mapUrl: null, file: 'app.js.map' };
    expect(labels(sourceMapMenu(BUNDLE, 'Script', nest))).toEqual(['Show original sources', 'Reload source map', 'Load a source map from a file…', 'Forget app.js.map']);
  });
});
