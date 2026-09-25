import { useActionStore } from '@/entities/action';
import { useOverrideStore } from '@/entities/override';
import { useConsoleStore } from '@/entities/console-log';
import { useFrameStore } from '@/entities/frame';
import { useSettingsStore } from '@/entities/settings';
import { useWorkspaceStore } from '@/entities/workspace';
import { receiveEntries } from '@/features/filter-console';
import { handleUpdateState } from '@/features/update-app';
import { runCommand } from './commands/runCommand';
import { answerFlushSession } from './events/answerFlushSession';
import { applyPageState } from './events/applyPageState';
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
  'worker-detached': (event) => queueResourceOp({ type: 'drop-worker', workerId: event.workerId }),
  resource: (event) => queueResourceOp({ type: 'add', entry: event.resource }),
  'override-served': (event) => useOverrideStore.getState().hit(event.overrideId),
  'upstream-changed': warnUpstreamChanged,
  'override-missed': warnOverrideMissed,
  'rule-applied': (event) => queueRuleHit(event),
  'rule-missed': warnRuleMissed,
  error: showAppError,
  'page-state': applyPageState,
  'overrides-changed': syncOverrides,
  'rules-changed': syncRules,
  'workspaces-changed': (event) => useWorkspaceStore.getState().setAll(event.state),
  'workspace-favicon': (event) => useWorkspaceStore.getState().setFavicon(event.id, event.favicon),
  'frames-changed': (event) => useFrameStore.getState().setAll(event.frames),
  'console-entries': (event) => receiveEntries(event.entries),
  'console-cleared': () => useConsoleStore.getState().clear(),
  'actions-changed': (event) => useActionStore.getState().setAll(event.actions),
  'actions-window': (event) => useActionStore.getState().setWindow(event.state),
  'settings-changed': (event) => useSettingsStore.getState().setSettings(event.settings),
  command: (event) => runCommand(event.command),
  'flush-session': answerFlushSession,
  update: (event) => handleUpdateState(event.state),
};
