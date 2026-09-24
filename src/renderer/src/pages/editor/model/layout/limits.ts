import { EDITOR_MIN_W, PREVIEW_RATIO, SIDEBAR_W } from './constants';
import { sidebarInRow } from './sidebarInRow';
import type { FitInput } from './types';

/** The activity rail (`--rail-w`). */
const RAIL_W = 48;

/** The room beside the editor's minimum width, and the panel minimums within it. */
export function limits(l: FitInput) {
  const room = Math.max(0, l.rowWidth - RAIL_W - EDITOR_MIN_W);
  const sidebarMin = sidebarInRow(l) ? SIDEBAR_W.min : 0;
  const previewMin = l.previewVisible ? PREVIEW_RATIO.min * l.rowWidth : 0;
  // A row too narrow for both beside the editor (a small or zoomed-in window): the minimums give way in proportion.
  const scale = Math.min(1, room / (sidebarMin + previewMin || 1));
  return { room, sidebarMin: sidebarMin * scale, previewMin: previewMin * scale };
}
