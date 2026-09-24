import { clamp } from '@/shared/lib';
import { PREVIEW_RATIO, SIDEBAR_W } from './constants';
import { limits } from './limits';
import { sidebarInRow } from './sidebarInRow';
import type { FitInput, PanelWidths } from './types';

/**
 * The panel widths the row has room for, leaving the editor at least
 * EDITOR_MIN_W: the preview gives way first, then the sidebar. The
 * preferences are kept, so a wider window brings them back.
 */
export function fitPanels(l: FitInput): PanelWidths {
  const { room, sidebarMin, previewMin } = limits(l);
  // Whole pixels under whole-pixel upper bounds, so the two never add up to more than the room.
  const sidebar = Math.round(clamp(l.sidebarWidth, sidebarMin, Math.min(SIDEBAR_W.max, Math.floor(room - previewMin))));
  const previewMax = Math.min(PREVIEW_RATIO.max * l.rowWidth, room - (sidebarInRow(l) ? sidebar : 0));
  const preview = l.previewVisible ? Math.round(clamp(l.previewRatio * l.rowWidth, previewMin, previewMax)) : 0;
  return { sidebar, preview };
}
