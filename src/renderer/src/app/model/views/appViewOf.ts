import { APP_VIEWS, EDITOR_VIEW } from './constants';
import type { AppView } from './types';

/** The view a window shows, by its location hash (`#page-window`); the editor when the hash names none. */
export function appViewOf(hash: string): AppView {
  const name = hash.slice(1);
  return Object.hasOwn(APP_VIEWS, name) ? (name as AppView) : EDITOR_VIEW;
}
