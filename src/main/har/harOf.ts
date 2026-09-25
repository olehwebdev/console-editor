import type { CdpTransport } from '../engine/cdp';
import { readRequestBody } from '../network/readRequestBody';
import { readResponseBody } from '../network/readResponseBody';
import type { TrackedRequest } from '../network/types';
import { HAR_VERSION } from './constants';
import { harEntryOf } from './harEntryOf';
import type { HarLog } from './types';

/** The app, as a HAR names what wrote it. */
const CREATOR = 'Console Editor';

/** Logged requests as a HAR log, their bodies read through the sessions that reported them (binary ones are left out). */
export async function harOf(transport: CdpTransport, entries: readonly TrackedRequest[], version: string): Promise<HarLog> {
  const sources = await Promise.all(
    entries.map(async (entry) => {
      const [requestBody, response] = await Promise.all([readRequestBody(transport, entry), readResponseBody(transport, entry)]);
      const responseBody = response.available && !response.binary ? response.text : undefined;
      return { entry, ...(requestBody !== undefined ? { requestBody } : {}), ...(responseBody !== undefined ? { responseBody } : {}) };
    }),
  );
  return { log: { version: HAR_VERSION, creator: { name: CREATOR, version }, pages: [], entries: sources.map(harEntryOf) } };
}
