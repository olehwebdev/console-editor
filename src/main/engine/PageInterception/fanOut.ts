import type { InterceptionEngine } from '../InterceptionEngine';
import type { ChildSessions } from './ChildSessions';
import { IFRAME_SETUP_TIMEOUT_MS } from './constants';
import { withTimeout } from './withTimeout';

/**
 * Runs `task` on the page's engine and on every live iframe session's. The
 * page's errors propagate; an iframe's are ignored (its session can vanish or stall mid-call).
 */
export async function fanOut(root: InterceptionEngine, children: ChildSessions, task: (engine: InterceptionEngine) => Promise<void>): Promise<void> {
  const page = task(root);
  const others = children.engines().map((engine) => withTimeout(task(engine), IFRAME_SETUP_TIMEOUT_MS, 'Updating an iframe').catch(() => undefined));
  await Promise.all([page, ...others]);
}
