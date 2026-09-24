import type { StoreApi } from 'zustand';
import { layoutSave } from './layoutSave';
import { save } from './save';
import { serialize } from './serialize';
import type { LayoutStore } from './types';

/** Debounce for writes, in ms: a burst of toggles or key steps is written once. */
const SAVE_DELAY = 250;

/** Every committed change is remembered (debounced); a drag only once it ends. */
export function rememberLayout(store: StoreApi<LayoutStore>): void {
  layoutSave.lastSaved = serialize(store.getState());
  store.subscribe((state) => {
    if (state.resizing || serialize(state) === layoutSave.lastSaved) return;
    clearTimeout(layoutSave.timer);
    layoutSave.timer = setTimeout(() => save(store.getState()), SAVE_DELAY);
  });
  window.addEventListener('pagehide', () => save(store.getState()));
}
