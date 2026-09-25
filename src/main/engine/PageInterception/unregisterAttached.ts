import { CDP } from '../constants';
import { UNREGISTER_EXPRESSION, UNREGISTER_TIMEOUT_MS } from './constants';
import { retire } from './retire';
import type { ChildContext, ChildTarget } from './types';
import { withTimeout } from './withTimeout';

/** Unregisters a service worker with a session: by scope through the browser, else from inside it. */
export async function unregisterAttached(ctx: ChildContext, child: ChildTarget): Promise<void> {
  const { cdp, serviceWorkers } = ctx;
  // Its registration is gone already: unregistering by scope would hit a newer one.
  if (serviceWorkers.isDeleted(child.targetId)) return retire(ctx, child);
  // Through the browser when its scope is known (a stopped worker can't answer).
  const scopeURL = serviceWorkers.scope(child.targetId);
  const unregister = scopeURL
    ? cdp.send(CDP.ServiceWorker.unregister, { scopeURL }).then(() => true)
    : child.transport
        .send<{ result?: { value?: unknown }; exceptionDetails?: unknown }>(CDP.Runtime.evaluate, {
          expression: UNREGISTER_EXPRESSION,
          awaitPromise: true,
          returnByValue: true,
        })
        // A rejected unregister() still answers, with exceptionDetails.
        .then((r) => !r.exceptionDetails && r.result?.value === true);
  // Otherwise tried again on the next reload.
  if (await withTimeout(unregister, UNREGISTER_TIMEOUT_MS, 'Unregistering the service worker').catch(() => false)) retire(ctx, child);
}
