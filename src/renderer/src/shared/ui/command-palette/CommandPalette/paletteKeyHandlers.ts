// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { KEY } from '@/shared/config';
import type { PaletteKeyHandler } from './types';

/** What each key does in the palette; any other key goes to the input. */
export const PALETTE_KEY_HANDLERS: Record<string, PaletteKeyHandler> = {
  [KEY.arrowDown]: (event, palette) => {
    event.preventDefault();
    palette.step(1);
  },
  [KEY.arrowUp]: (event, palette) => {
    event.preventDefault();
    palette.step(-1);
  },
  [KEY.pageDown]: (event, palette) => {
    event.preventDefault();
    palette.page(1);
  },
  [KEY.pageUp]: (event, palette) => {
    event.preventDefault();
    palette.page(-1);
  },
  [KEY.enter]: (event, palette) => {
    event.preventDefault();
    palette.runActive();
  },
  [KEY.escape]: (event, palette) => {
    event.preventDefault();
    event.stopPropagation();
    palette.close();
  },
  // The input is the only stop; keep focus inside the dialog.
  [KEY.tab]: (event) => event.preventDefault(),
};
