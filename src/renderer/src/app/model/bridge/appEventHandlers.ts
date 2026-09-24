import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { handleUpdateState } from '@/features/update-app';
import { runCommand } from './commands/runCommand';
import { answerFlushSession } from './events/answerFlushSession';
import { dropNavigatedResources } from './events/dropNavigatedResources';
import { showAppError } from './events/showAppError';
import { syncOverrides } from './events/syncOverrides';
import { warnOverrideMissed } from './events/warnOverrideMissed';
import { warnUpstreamChanged } from './events/warnUpstreamChanged';
import { queueIframeDrop } from './resources/queueIframeDrop';
import { queueResourceOp } from './resources/queueResourceOp';
import type { AppEventHandlers } from './types';

/** What each main-process event does. Annotated rather than `satisfies`: `handleAppEvent`'s generic lookup needs the mapped type. */
export const APP_EVENT_HANDLERS: AppEventHandlers = {
  navigated: dropNavigatedResources,
  'iframe-detached': (event) => queueIframeDrop(event.iframeId),
  resource: (event) => queueResourceOp({ type: 'add', entry: event.resource }),
  'override-served': (event) => useOverrideStore.getState().hit(event.overrideId),
  'upstream-changed': warnUpstreamChanged,
  'override-missed': warnOverrideMissed,
  error: showAppError,
  'page-state': (event) => usePageStore.getState().setPage(event.state),
  'overrides-changed': syncOverrides,
  command: (event) => runCommand(event.command),
  'flush-session': answerFlushSession,
  update: (event) => handleUpdateState(event.state),
};
