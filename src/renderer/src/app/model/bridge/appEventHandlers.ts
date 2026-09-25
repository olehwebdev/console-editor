import { useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { useWorkspaceStore } from '@/entities/workspace';
import { handleUpdateState } from '@/features/update-app';
import { runCommand } from './commands/runCommand';
import { answerFlushSession } from './events/answerFlushSession';
import { dropNavigatedResources } from './events/dropNavigatedResources';
import { showAppError } from './events/showAppError';
import { syncOverrides } from './events/syncOverrides';
import { syncRules } from './events/syncRules';
import { warnOverrideMissed } from './events/warnOverrideMissed';
import { warnRuleMissed } from './events/warnRuleMissed';
import { warnUpstreamChanged } from './events/warnUpstreamChanged';
import { queueIframeDrop } from './resources/queueIframeDrop';
import { queueResourceOp } from './resources/queueResourceOp';
import { queueRuleHit } from './rules/queueRuleHit';
import type { AppEventHandlers } from './types';

/** What each main-process event does. Annotated rather than `satisfies`: `handleAppEvent`'s generic lookup needs the mapped type. */
export const APP_EVENT_HANDLERS: AppEventHandlers = {
  navigated: dropNavigatedResources,
  'iframe-detached': (event) => queueIframeDrop(event.iframeId),
  resource: (event) => queueResourceOp({ type: 'add', entry: event.resource }),
  'override-served': (event) => useOverrideStore.getState().hit(event.overrideId),
  'upstream-changed': warnUpstreamChanged,
  'override-missed': warnOverrideMissed,
  'rule-applied': (event) => queueRuleHit(event),
  'rule-missed': warnRuleMissed,
  error: showAppError,
  'page-state': (event) => usePageStore.getState().setPage(event.state),
  'overrides-changed': syncOverrides,
  'rules-changed': syncRules,
  'workspaces-changed': (event) => useWorkspaceStore.getState().setAll(event.state),
  'workspace-favicon': (event) => useWorkspaceStore.getState().setFavicon(event.id, event.favicon),
  command: (event) => runCommand(event.command),
  'flush-session': answerFlushSession,
  update: (event) => handleUpdateState(event.state),
};
