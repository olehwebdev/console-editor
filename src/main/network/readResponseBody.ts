import type { NetworkBody } from '../../shared/types';
import type { CdpTransport } from '../engine/cdp';
import { CDP, CONTENT_TYPE, EVENT_STREAM_MIME_TYPE } from '../engine/constants';
import { withTimeout } from '../engine/PageInterception/withTimeout';
import { decodeBody, headerValue } from '../engine/transform';
import { READ_TIMEOUT_MS, TEXT_MIME } from './constants';
import type { TrackedRequest } from './types';

/**
 * A response's body, read through the session that received it. Never an event stream's (reading
 * one ends it for the page), nor one still arriving or that never came; one Chromium no longer holds
 * is `gone`. A text body is decoded with its charset; any other is only said to be binary.
 */
export async function readResponseBody(transport: CdpTransport, entry: TrackedRequest): Promise<NetworkBody> {
  const { row } = entry;
  if (row.mimeType.toLowerCase().includes(EVENT_STREAM_MIME_TYPE)) return { available: false, gap: 'stream' };
  if (row.state === 'pending') return { available: false, gap: 'pending' };
  if (row.state === 'failed' && row.status === 0) return { available: false, gap: 'failed' };
  try {
    const read = transport.send<{ body: string; base64Encoded: boolean }>(CDP.Network.getResponseBody, { requestId: entry.requestId }, entry.sessionId);
    const { body, base64Encoded } = await withTimeout(read, READ_TIMEOUT_MS, 'Reading a response');
    const text = !base64Encoded || TEXT_MIME.test(row.mimeType);
    const contentType = headerValue(entry.responseHeaders, CONTENT_TYPE) ?? row.mimeType;
    return { available: true, text: text ? decodeBody(body, base64Encoded, contentType) : '', binary: !text };
  } catch {
    return { available: false, gap: 'gone' };
  }
}
