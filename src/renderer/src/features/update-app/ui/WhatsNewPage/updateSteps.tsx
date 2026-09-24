import { DownloadProgress } from './DownloadProgress';
import { DownloadStep } from './DownloadStep';
import { ReadyStep } from './ReadyStep';
import type { UpdateStepViews } from './types';

/**
 * The update card's footer in each state. Annotated rather than `satisfies`:
 * `UpdateStep`'s generic lookup needs the mapped type.
 */
export const UPDATE_STEPS: UpdateStepViews = {
  downloading: ({ state }) => <DownloadProgress percent={state.percent} />,
  ready: ({ update, state }) => <ReadyStep update={update} file={state.file} />,
  error: ({ update, state }) => <DownloadStep update={update} error={state} />,
  available: ({ update }) => <DownloadStep update={update} />,
  // No update is on offer in these, so the card isn't shown.
  disabled: ({ update }) => <DownloadStep update={update} />,
  idle: ({ update }) => <DownloadStep update={update} />,
  checking: ({ update }) => <DownloadStep update={update} />,
  'up-to-date': ({ update }) => <DownloadStep update={update} />,
};
