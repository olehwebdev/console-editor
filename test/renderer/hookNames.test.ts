import { describe, expect, it } from 'vitest';
import { handleSourceMapRequest, type LoadedMaps } from '@/shared/lib/source-map/host';

const BUNDLE_URL = 'https://site.test/assets/app.js';
const CART_URL = 'https://site.test/src/CartItem.tsx';

const CART = `import { useContext, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useCart } from './cart';

function useLine(price: number) {
  const [qty, setQty] = useState(1);
  const total = useMemo(() => price * qty, [price, qty]);
  return { qty, setQty, total };
}

const useTicker = () => {
  const ticks = useRef(0) as { current: number };
  return ticks;
};

export function CartItem({ sku, price }: { sku: string; price: number }) {
  const currency = useContext(CurrencyContext);
  const count = useSyncExternalStore(store.subscribe, store.get);
  const { qty, setQty, total } = useLine(price);
  const ticks = useTicker();
  React.useEffect(() => {
    const inner = useState(0); // not this component's
  }, []);
  const [isPending, startTransition] = useTransition();
  return <li>{sku}</li>;
}

export const Row = ({ id }: { id: string }) => {
  const [open, setOpen] = useState(false);
  const cart = useCart();
  const after = useRef(null);
  return null;
};
`;

/** A map whose one source is `content`, so the worker has its text. */
const load = (maps: LoadedMaps, url: string, content: string) =>
  handleSourceMapRequest(maps, {
    type: 'load',
    bundleUrl: BUNDLE_URL,
    mapUrl: `${BUNDLE_URL}.map`,
    bundle: 'x',
    map: { type: 'bytes', bytes: new TextEncoder().encode(JSON.stringify({ version: 3, sources: [url], sourcesContent: [content], names: [], mappings: 'AAAA' })) },
  });
/** 1-based line and column of where `text` starts. */
const placeOf = (content: string, text: string) => {
  const lines = content.split('\n');
  const line = lines.findIndex((l) => l.includes(text));
  return { line: line + 1, column: lines[line]!.indexOf(text) + 1 };
};

describe("a React component's hook names, read off its original", () => {
  it('lays hook calls out as React keeps them, following custom hooks in the same file', () => {
    const maps: LoadedMaps = new Map();
    load(maps, CART_URL, CART);
    const reply = handleSourceMapRequest(maps, { type: 'hookNames', bundleUrl: BUNDLE_URL, url: CART_URL, ...placeOf(CART, 'function CartItem(') });
    // useContext adds none, useSyncExternalStore two, useLine its own two, the effect one (its inner call is not this component's), useTransition two.
    expect(reply).toEqual({ names: ['count', 'count', 'qty', 'total', 'ticks', 'useEffect', 'isPending', 'isPending'] });
  });

  it("stops at a custom hook defined elsewhere: how many entries it adds isn't known", () => {
    const maps: LoadedMaps = new Map();
    load(maps, CART_URL, CART);
    // An arrow's place is its parameters.
    expect(handleSourceMapRequest(maps, { type: 'hookNames', bundleUrl: BUNDLE_URL, url: CART_URL, ...placeOf(CART, '({ id }') })).toEqual({ names: ['open'] });
  });

  it('reads nothing off a file that is not JavaScript or TypeScript, or a place with no function', () => {
    const maps: LoadedMaps = new Map();
    load(maps, 'https://site.test/src/Cart.vue', CART);
    expect(handleSourceMapRequest(maps, { type: 'hookNames', bundleUrl: BUNDLE_URL, url: 'https://site.test/src/Cart.vue', line: 15, column: 8 })).toEqual({ names: [] });
    expect(handleSourceMapRequest(maps, { type: 'hookNames', bundleUrl: BUNDLE_URL, url: 'https://site.test/src/other.ts', line: 1, column: 1 })).toEqual({ miss: 'unknown-source' });
  });
});
