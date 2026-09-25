/**
 * Large stores for the inspector's performance checks: a Redux Toolkit store holding `ENTITIES` entities
 * (normalized, as `createEntityAdapter` keeps them) and a Pinia store holding as many items in an array,
 * each changed by one action at a time from a button.
 */
import { configureStore, createEntityAdapter, createSlice } from '@reduxjs/toolkit';
import { createPinia, defineStore } from 'pinia';
import { createApp, h } from 'vue';

const ENTITIES = 20000;

interface Item {
  id: number;
  name: string;
  qty: number;
}
const items = Array.from({ length: ENTITIES }, (_, id): Item => ({ id, name: `item ${id}`, qty: 0 }));

const adapter = createEntityAdapter<Item>();
const slice = createSlice({
  name: 'items',
  initialState: adapter.addMany(adapter.getInitialState(), items),
  reducers: {
    bumped(state, action: { payload: number }) {
      state.entities[action.payload]!.qty += 1;
    },
  },
});
const store = configureStore({ reducer: { items: slice.reducer }, middleware: (defaults) => defaults({ serializableCheck: false, immutableCheck: false }) });

const useItems = defineStore('items', {
  state: () => ({ list: items.map((item) => ({ ...item })), total: 0 }),
  actions: {
    bump(id: number) {
      this.list[id]!.qty += 1;
      this.total += 1;
    },
  },
});

let next = 0;
createApp({
  setup() {
    const pinia = useItems();
    return () =>
      h('div', null, [
        h('button', { id: 'redux', onClick: () => store.dispatch(slice.actions.bumped(next++ % ENTITIES)) }, 'redux'),
        h('button', { id: 'pinia', onClick: () => pinia.bump(next++ % ENTITIES) }, 'pinia'),
        h('p', { id: 'total' }, String(pinia.total)),
      ]);
  },
})
  .use(createPinia())
  .mount('#root');
