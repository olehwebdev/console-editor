import type { RawBody } from './types';

/** A body as `Fetch.fulfillRequest` takes it (base64). `reencoded`: it came as text and is now UTF-8 bytes. */
export function toBase64Body(raw: RawBody): { body: string; reencoded: boolean } {
  return raw.base64Encoded ? { body: raw.body, reencoded: false } : { body: Buffer.from(raw.body, 'utf8').toString('base64'), reencoded: true };
}
