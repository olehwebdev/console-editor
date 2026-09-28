import { CDP } from '../constants';
import type { CdpConnection } from './CdpConnection';
import { pageTransport } from './pageTransport';
import type { PageTransport } from './types';

/**
 * Attaches to a page target and returns a transport whose root session is that
 * page. Child sessions (auto-attached iframes) are addressed by their sessionId;
 * their events carry it, while the page's own events carry none.
 */
export async function attachToPage(connection: CdpConnection, targetId: string): Promise<PageTransport> {
  const { sessionId } = await connection.send<{ sessionId: string }>(CDP.Target.attachToTarget, { targetId, flatten: true });
  return pageTransport(connection, sessionId);
}
