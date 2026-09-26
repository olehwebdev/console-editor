/**
 * A cart in React with Redux Toolkit for the store timeline's tests, bundled by
 * the test from the repo's own packages: `configureStore` (which composes the
 * Redux DevTools extension in when a page has it), a slice whose reducer adds an
 * item, an item that dispatches in its click handler, and a checkout button that
 * sends a request from its own.
 */
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createElement as h, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useDispatch, useSelector } from 'react-redux';

const cart = createSlice({
  name: 'cart',
  initialState: { count: 0, skus: [] as string[] },
  reducers: {
    added(state, action: PayloadAction<string>) {
      state.count += 1;
      state.skus.push(action.payload);
    },
  },
});
const store = configureStore({ reducer: { cart: cart.reducer } });

function CartItem({ sku }: { sku: string }) {
  const dispatch = useDispatch();
  function handleAdd() {
    dispatch(cart.actions.added(sku));
  }
  return h('li', null, `${sku} `, h('button', { id: `add-${sku}`, onClick: handleAdd }, 'Add'));
}

function CartCount() {
  const count = useSelector((state: { cart: { count: number } }) => state.cart.count);
  return h('p', { id: 'count' }, `${count} items`);
}

function Checkout() {
  function handleCheckout() {
    void fetch('/api/checkout', { method: 'POST', body: '{}' });
  }
  return h('button', { id: 'checkout', onClick: handleCheckout }, 'Checkout');
}

function App() {
  return h(Provider, { store, children: h(Fragment, null, h('ul', null, h(CartItem, { sku: 'A1' })), h(CartCount), h(Checkout)) });
}

createRoot(document.getElementById('root')!).render(h(App));
