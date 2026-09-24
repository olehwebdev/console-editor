import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { EVAL_OBJECT_GROUP } from '../constants';

/** Drops what a session kept of the console: Chromium's own copy of its rows, and the values of code you ran. */
export async function discardEntries(transport: CdpTransport): Promise<void> {
  await transport.send(CDP.Runtime.discardConsoleEntries).catch(() => undefined);
  await transport.send(CDP.Runtime.releaseObjectGroup, { objectGroup: EVAL_OBJECT_GROUP }).catch(() => undefined);
}
