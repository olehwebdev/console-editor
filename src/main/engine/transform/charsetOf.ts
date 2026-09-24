import { UTF8 } from './constants';

/** The `charset` parameter of a Content-Type, quoted or not. */
const CHARSET_PARAM = /charset\s*=\s*"?([^";\s]+)/i;

export function charsetOf(contentType: string | undefined): string {
  const m = contentType && CHARSET_PARAM.exec(contentType);
  return m ? m[1].toLowerCase() : UTF8;
}
