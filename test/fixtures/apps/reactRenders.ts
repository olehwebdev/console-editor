/**
 * A React app for the inspector's Renders tests, bundled by the test from the
 * repo's own react and react-dom: each button makes a commit for a different
 * reason (its own state and a store, a context, a parent's state with a memo
 * child skipped, a class's state), and each component shows why it rendered.
 */
import { Component, createContext, createElement as h, memo, useContext, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

const CurrencyContext = createContext('USD');
let count = 0;
const listeners = new Set<() => void>();
const store = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
  get: () => count,
  add() {
    count += 1;
    listeners.forEach((listener) => listener());
  },
};

function CartItem({ sku, price }: { sku: string; price: number }) {
  const currency = useContext(CurrencyContext);
  const [qty, setQty] = useState(1);
  function handleAdd() {
    setQty(qty + 1);
    store.add();
  }
  return h('li', null, `${sku} ${price * qty} ${currency} `, h('button', { id: `add-${sku}`, onClick: handleAdd }, 'Add'));
}

function CartBadge() {
  const items = useSyncExternalStore(store.subscribe, store.get);
  return h('span', { id: 'badge' }, items);
}

const CartList = memo(function CartList({ items }: { items: Array<{ sku: string; price: number }> }) {
  return h('ul', null, items.map((item) => h(CartItem, { key: item.sku, sku: item.sku, price: item.price })));
});

class Clock extends Component<object, { ticks: number }> {
  state = { ticks: 0 };
  render() {
    return h('button', { id: 'tick', onClick: () => this.setState({ ticks: this.state.ticks + 1 }) }, this.state.ticks);
  }
}

function Footer({ note }: { note: string }) {
  return h('footer', null, note);
}

const ITEMS = [
  { sku: 'A1', price: 10 },
  { sku: 'B2', price: 5 },
];

function App() {
  const [currency, setCurrency] = useState('EUR');
  const [theme, setTheme] = useState('dark');
  return h(
    CurrencyContext.Provider,
    { value: currency },
    h('button', { id: 'currency', onClick: () => setCurrency(currency === 'EUR' ? 'USD' : 'EUR') }, 'currency'),
    h('button', { id: 'theme', onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark') }, 'theme'),
    h(CartBadge),
    h(CartList, { items: ITEMS }),
    h(Clock),
    h(Footer, { note: theme }),
  );
}

createRoot(document.getElementById('root')!).render(h(App));
