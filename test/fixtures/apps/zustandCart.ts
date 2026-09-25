/**
 * A cart in React with a Zustand store for the store timeline's tests, bundled by
 * the test from the repo's own packages: the store reports its changes through
 * Zustand's devtools middleware (turned on, as a production build needs it to
 * be), and an item adds itself in its click handler.
 */
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CartState {
  count: number;
  last: string | null;
  add(sku: string): void;
}

const useCart = create<CartState>()(
  devtools((set) => ({ count: 0, last: null, add: (sku) => set((s) => ({ count: s.count + 1, last: sku }), undefined, 'cart/add') }), { name: 'cart', enabled: true }),
);

function CartItem({ sku }: { sku: string }) {
  const add = useCart((s) => s.add);
  const count = useCart((s) => s.count);
  function handleAdd() {
    add(sku);
  }
  return h('li', null, `${sku} ${count} `, h('button', { id: `add-${sku}`, onClick: handleAdd }, 'Add'));
}

createRoot(document.getElementById('root')!).render(h('ul', null, h(CartItem, { sku: 'A1' })));
