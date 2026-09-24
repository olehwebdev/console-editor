import { toast } from '@/shared/ui/toast';
import { announce } from './announce';
import { announceReady } from './announceReady';
import { UPDATE_TOAST_ID } from './constants';
import { reason } from './reason';
import type { UpdateStateHandlers } from './types';

/**
 * What a check the user asked for says, by where it left the updater. Annotated
 * rather than `satisfies`: `reportCheckResult`'s generic lookup needs the mapped type.
 */
export const CHECK_RESULT_REPORTS: UpdateStateHandlers = {
  disabled: () => toast({ id: UPDATE_TOAST_ID, title: 'Updates come to installed copies', description: 'This one runs from source: pull the latest changes instead.' }),
  'up-to-date': (state) =>
    toast({ id: UPDATE_TOAST_ID, title: "You're up to date", description: `Console Editor ${state.version} is the latest version.`, tone: 'success' }),
  error: (state) => toast({ id: UPDATE_TOAST_ID, title: "Couldn't check for updates", description: reason(state.message), tone: 'danger' }),
  available: (state) => announce(state.update),
  ready: (state) => announceReady(state.update, state.file),
  downloading: (state) =>
    toast({
      id: UPDATE_TOAST_ID,
      title: `Downloading Console Editor ${state.update.version}…`,
      description: `${state.percent}% so far. The status bar shows its progress.`,
    }),
  idle: () => undefined,
  checking: () => undefined,
};
