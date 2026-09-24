import { charsetOf } from './charsetOf';
import { UTF8 } from './constants';

/** Decodes a CDP body (`base64Encoded` or plain text) into a string. */
export function decodeBody(body: string, base64Encoded: boolean, contentType?: string): string {
  if (!base64Encoded) return body;
  const bytes = Buffer.from(body, 'base64');
  try {
    return new TextDecoder(charsetOf(contentType)).decode(bytes);
  } catch {
    return new TextDecoder(UTF8).decode(bytes);
  }
}
