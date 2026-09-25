// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { TAB_ID_ATTR } from './constants';

/** The element of tab `id` in the strip, if it is rendered. */
export function findTab(scroller: HTMLElement | null, id: string | null | undefined): HTMLElement | null {
  if (!id) return null;
  return scroller?.querySelector<HTMLElement>(`[${TAB_ID_ATTR}="${CSS.escape(id)}"]`) ?? null;
}
