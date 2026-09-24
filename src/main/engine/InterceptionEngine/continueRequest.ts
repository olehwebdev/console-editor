import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';

/** Lets a paused request go on unchanged. */
export async function continueRequest(cdp: CdpTransport, requestId: string): Promise<void> {
  try {
    await cdp.send(CDP.Fetch.continueRequest, { requestId });
  } catch {
    // The request was cancelled (e.g. the page navigated away); nothing to do.
  }
}
