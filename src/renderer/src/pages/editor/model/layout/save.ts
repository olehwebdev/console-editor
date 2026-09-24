import { STORAGE_KEY } from './constants';
import { layoutSave } from './layoutSave';
import { serialize } from './serialize';
import type { Layout } from './types';

/** Writes `state` now, unless a drag is under way or it is what was last written. */
export function save(state: Layout): void {
  clearTimeout(layoutSave.timer);
  layoutSave.timer = undefined;
  const json = serialize(state);
  if (state.resizing || json === layoutSave.lastSaved) return;
  try {
    localStorage.setItem(STORAGE_KEY, json);
    layoutSave.lastSaved = json;
  } catch {
    // Not persisted; fine.
  }
}
