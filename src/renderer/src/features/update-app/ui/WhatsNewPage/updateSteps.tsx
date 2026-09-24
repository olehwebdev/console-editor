import { downloadProgress } from './downloadProgress';
import { downloadStep } from './downloadStep';
import { readyStep } from './readyStep';
import type { UpdateStepViews } from './types';

/**
 * The update card's footer in each state. The steps are called, not rendered as components:
 * the download and ready steps are both a hint and a button, so React keeps those nodes, and
 * the button's focus, when one follows the other.
 * Annotated rather than `satisfies`: `UpdateStep`'s generic lookup needs the mapped type.
 */
export const UPDATE_STEPS: UpdateStepViews = {
  downloading: ({ state }) => downloadProgress(state.percent),
  ready: ({ update, state }) => readyStep(update, state.file),
  error: ({ update, state }) => downloadStep(update, state),
  available: ({ update }) => downloadStep(update),
  // No update is on offer in these, so the card isn't shown.
  disabled: ({ update }) => downloadStep(update),
  idle: ({ update }) => downloadStep(update),
  checking: ({ update }) => downloadStep(update),
  'up-to-date': ({ update }) => downloadStep(update),
};
