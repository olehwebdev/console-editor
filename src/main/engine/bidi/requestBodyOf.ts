import { BASE64_BYTES, BIDI, REQUEST_DATA } from './constants';
import type { BidiAnswerContext, BidiBytes, BidiRequestData } from './types';

/**
 * A paused request's body as text, let go of once read: only while a collector keeps bodies (an override names a
 * GraphQL operation), and only one it kept (it has a body, not too large). Undefined otherwise.
 */
export async function requestBodyOf({ connection, collector }: BidiAnswerContext, { request, bodySize }: BidiRequestData): Promise<string | undefined> {
  if (!collector || !bodySize) return undefined;
  const params = { dataType: REQUEST_DATA, collector, request, disown: true };
  const data = await connection.send<{ bytes: BidiBytes }>(BIDI.network.getData, params).catch(() => null);
  if (!data) return undefined;
  const { type, value } = data.bytes;
  return type === BASE64_BYTES ? Buffer.from(value, 'base64').toString('utf8') : value;
}
