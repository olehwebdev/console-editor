import type { InterceptionEngine } from '../InterceptionEngine';
import type { ChildSessions } from './ChildSessions';
import { SETUP_TIMEOUT_MS } from './constants';
import { withTimeout } from './withTimeout';

/**
 * Runs `task` on the page's engine and on every live child session's. The
 * page's errors propagate; a child's are ignored (its session can vanish or stall mid-call).
 */
export async function fanOut(root: InterceptionEngine, children: ChildSessions, task: (engine: InterceptionEngine) => Promise<void>): Promise<void> {
  const page = task(root);
  const others = children.engines().map((engine) => withTimeout(task(engine), SETUP_TIMEOUT_MS, 'Updating a child session').catch(() => undefined));
  await Promise.all([page, ...others]);
}
