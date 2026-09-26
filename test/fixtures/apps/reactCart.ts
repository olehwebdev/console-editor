/**
 * A cart in React for the inspector's integration test, bundled by the test from
 * the repo's own react and react-dom: an item reads a context, keeps state and
 * handles a click, inside a list inside the app that provides the context.
 */
import { createContext, createElement as h, useContext, useState } from 'react';
import { createRoot } from 'react-dom/client';

const CurrencyContext = createContext('USD');

function CartItem({ sku, price }: { sku: string; price: number }) {
  const currency = useContext(CurrencyContext);
  const [qty, setQty] = useState(1);
  function handleAdd() {
    setQty(qty + 1);
  }
  return h('li', { className: 'cart-item' }, `${sku} ${price * qty} ${currency} `, h('button', { id: `add-${sku}`, onClick: handleAdd }, 'Add'));
}

function CartList({ items }: { items: Array<{ sku: string; price: number }> }) {
  return h('ul', null, items.map((item) => h(CartItem, { key: item.sku, sku: item.sku, price: item.price })));
}

function App() {
  return h(CurrencyContext.Provider, { value: 'EUR' }, h(CartList, { items: [{ sku: 'A1', price: 10 }, { sku: 'B2', price: 5 }] }));
}

createRoot(document.getElementById('root')!).render(h(App));
