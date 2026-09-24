import { toast } from '@/shared/ui/toast';
import { announce } from './announce';
import { announcement } from './announcement';
import { announceReady } from './announceReady';
import { UPDATE_TOAST_ID } from './constants';
import type { UpdateStateChangeHandlers } from './types';
import { warnUpdateFailed } from './warnUpdateFailed';

/**
 * What the user hears of each state the main process reports. Annotated rather
 * than `satisfies`: `handleUpdateState`'s generic lookup needs the mapped type.
 */
export const UPDATE_STATE_NOTICES: UpdateStateChangeHandlers = {
  available: (state) => {
    if (announcement.version !== state.update.version) announce(state.update);
  },
  downloading: (_state, prev) => {
    // Progress shows in the status bar and on the What's New page.
    if (prev.status !== 'downloading') toast.dismiss(UPDATE_TOAST_ID);
  },
  ready: (state, prev) => {
    if (prev.status === 'downloading') announceReady(state.update, state.file);
  },
  error: warnUpdateFailed,
  disabled: () => undefined,
  idle: () => undefined,
  checking: () => undefined,
  'up-to-date': () => undefined,
};
