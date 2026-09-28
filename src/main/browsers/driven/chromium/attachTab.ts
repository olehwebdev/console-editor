import { CDP } from '../../../engine/constants';
import { PageInterception } from '../../../engine/PageInterception';
import { pageTransport, type CdpConnection } from '../../../engine/websocketTransport';
import type { InterceptionSources } from '../types';
import type { AttachedPage, DrivenTabState } from './types';

/**
 * Serves the workspace's changes in a tab just attached: an interception of its own on its session, set up before
 * the tab (paused, when it is new) is let run.
 */
export function attachTab(connection: CdpConnection, { sessionId, targetInfo }: AttachedPage, { store, rules, settings }: InterceptionSources): DrivenTabState {
  const transport = pageTransport(connection, sessionId);
  const interception = new PageInterception({
    transport,
    getOverrides: () => store.list(),
    getRules: () => rules.list(),
    getSettings: () => settings.get(),
    getOverrideBase: (id) => store.base(id),
    // The app's network list and console are its own page's: nothing is reported from other browsers.
    emit: () => undefined,
  });
  const ready = interception
    .attach()
    .catch(() => undefined)
    .then(() => transport.send(CDP.Runtime.runIfWaitingForDebugger))
    .then(
      () => undefined,
      () => undefined,
    );
  return { info: { id: targetInfo.targetId, title: targetInfo.title, url: targetInfo.url }, sessionId, transport, interception, ready };
}
