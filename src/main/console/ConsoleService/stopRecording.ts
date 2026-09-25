import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';

/** Turns off what reports a session's contexts, logs and errors, and drops what Chromium kept of them. */
export function stopRecording(transport: CdpTransport): void {
  // Chromium replays what it kept when turned on again: rows already shown would come back.
  transport.send(CDP.Runtime.discardConsoleEntries).catch(() => undefined);
  transport.send(CDP.Log.clear).catch(() => undefined);
  transport.send(CDP.Runtime.disable).catch(() => undefined);
  transport.send(CDP.Log.disable).catch(() => undefined);
}
