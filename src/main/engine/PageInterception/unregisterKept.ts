import { CDP } from '../constants';
import { UNREGISTER_TIMEOUT_MS } from './constants';
import type { ChildContext } from './types';
import { withTimeout } from './withTimeout';

/**
 * Unregisters a service worker with no session, through the browser: only
 * possible while its scope is known. Forgotten once done (or once its
 * registration is gone); else kept, and handled when it attaches again.
 */
export async function unregisterKept({ cdp, serviceWorkers }: ChildContext, targetId: string): Promise<void> {
  if (serviceWorkers.isDeleted(targetId)) {
    serviceWorkers.forget(targetId);
    return;
  }
  const scopeURL = serviceWorkers.scope(targetId);
  if (!scopeURL) return;
  const unregister = cdp.send(CDP.ServiceWorker.unregister, { scopeURL }).then(() => true);
  if (!(await withTimeout(unregister, UNREGISTER_TIMEOUT_MS, 'Unregistering the service worker').catch(() => false))) return;
  serviceWorkers.forget(targetId);
  // Chromium may attach the unregistered version again: it's left alone then, as when a session is let go.
  serviceWorkers.retire(targetId);
}
