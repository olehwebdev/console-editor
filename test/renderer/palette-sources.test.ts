import { describe, expect, it, vi } from 'vitest';
import type { SourceMapKind } from '../../src/shared/types';
import type { OriginalSource } from '@/shared/lib';
import type { LoadedSource } from '@/entities/source-map';
import { originalSourceItems, PALETTE_SOURCE_LIMIT } from '@/widgets/command-palette/model/files';

const MAIN = 'https://site.test/static/js/main.js';
const VENDOR = 'https://site.test/static/js/vendor.js';
const THEME = 'https://site.test/theme.css';
const source = (url: string, library = false): OriginalSource => ({ url, hasContent: true, library });
const loaded = (bundleUrl: string, ...sources: OriginalSource[]): LoadedSource[] => sources.map((s) => ({ bundleUrl, source: s }));
const listed = (...bundles: [string, SourceMapKind][]) => new Map(bundles);

describe('original sources in the palette', () => {
  it('lists authored originals of loaded maps whose bundle is on the page, and opens them with its kind', () => {
    const open = vi.fn();
    const items = originalSourceItems(
      [...loaded(MAIN, source('webpack://app/src/lib.ts'), source('webpack://app/node_modules/react/index.js', true)), ...loaded(THEME, source('https://site.test/scss/theme.scss'))],
      listed([MAIN, 'Script'], [THEME, 'Stylesheet']),
      open,
    );
    expect(items.map((i) => [i.label, i.hint])).toEqual([
      ['lib.ts', 'src · main.js'],
      ['theme.scss', 'scss · theme.css'],
    ]);
    items[1]!.onSelect();
    expect(open).toHaveBeenCalledExactlyOnceWith(THEME, 'Stylesheet', 'https://site.test/scss/theme.scss');
    expect(items[0]!.keywords).toEqual(['webpack://app/src/lib.ts', 'main.js']);
  });

  it('leaves out library sources and bundles no longer listed', () => {
    const items = originalSourceItems([...loaded(MAIN, source('webpack://app/x.js', true)), ...loaded(VENDOR, source('webpack://app/y.ts'))], listed([MAIN, 'Script']), vi.fn());
    expect(items).toEqual([]);
  });

  it('gives ids unique across bundles, and never a page file’s', () => {
    const shared = source('webpack://app/src/a.ts');
    const items = originalSourceItems([...loaded(MAIN, shared), ...loaded(VENDOR, shared)], listed([MAIN, 'Script'], [VENDOR, 'Script']), vi.fn());
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
    for (const item of items) expect(item.id).not.toMatch(/^https?:/);
  });

  it(`caps the list at ${PALETTE_SOURCE_LIMIT}`, () => {
    const many = Array.from({ length: PALETTE_SOURCE_LIMIT + 5 }, (_, i) => source(`webpack://app/src/f${i}.ts`));
    expect(originalSourceItems(loaded(MAIN, ...many), listed([MAIN, 'Script']), vi.fn())).toHaveLength(PALETTE_SOURCE_LIMIT);
  });
});
