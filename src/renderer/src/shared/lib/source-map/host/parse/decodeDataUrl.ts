import { BASE64_SUFFIX, BYTES_PER_MB } from '../../constants';
import type { Parsed } from '../types';
import { percentDecode } from './percentDecode';

const DATA_SCHEME = 'data:';
const COMMA = ',';
/** ASCII whitespace, which base64 in a data: URL may contain. */
const ASCII_WHITESPACE = /[\t\n\f\r ]/g;

/** The bytes of an inline map (a data: URL, as the WHATWG decodes it): base64, or percent-encoded. */
export function decodeDataUrl(dataUrl: string, maxBytes: number): Parsed<Uint8Array> {
  const comma = dataUrl.indexOf(COMMA);
  if (comma === -1) return { ok: false, failure: 'invalid-data-url', detail: '' };
  const tooLarge = { ok: false, failure: 'too-large', detail: String(Math.round(maxBytes / BYTES_PER_MB)) } as const;
  const media = dataUrl.slice(DATA_SCHEME.length, comma).trim().toLowerCase();
  const payload = dataUrl.slice(comma + 1);
  if (!media.endsWith(BASE64_SUFFIX)) {
    const bytes = percentDecode(payload);
    return bytes.length > maxBytes ? tooLarge : { ok: true, value: bytes };
  }
  let binary: string;
  try {
    binary = atob(payload.replace(ASCII_WHITESPACE, ''));
  } catch {
    return { ok: false, failure: 'invalid-data-url', detail: '' };
  }
  if (binary.length > maxBytes) return tooLarge;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { ok: true, value: bytes };
}
