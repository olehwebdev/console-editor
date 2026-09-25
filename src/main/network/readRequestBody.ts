import type { CdpTransport } from '../engine/cdp';
import { CDP } from '../engine/constants';
import { withTimeout } from '../engine/PageInterception/withTimeout';
import { READ_TIMEOUT_MS } from './constants';
import type { TrackedRequest } from './types';

/**
 * A request's body as text: the one `requestWillBeSent` carried, else read (once) through its session.
 * Undefined when it had none, or it can't be read any more.
 */
export async function readRequestBody(transport: CdpTransport, entry: TrackedRequest): Promise<string | undefined> {
  if (entry.postData !== undefined || !entry.row.hasBody) return entry.postData;
  try {
    const read = transport.send<{ postData: string }>(CDP.Network.getRequestPostData, { requestId: entry.requestId }, entry.sessionId);
    entry.postData = (await withTimeout(read, READ_TIMEOUT_MS, 'Reading a request body')).postData;
  } catch {
    // Gone with its session, or never kept (a large upload).
  }
  return entry.postData;
}
