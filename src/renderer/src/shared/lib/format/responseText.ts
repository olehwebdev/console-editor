import { RESPONSE_KIND } from '@common/overrides';
import { formatCode } from './formatCode';
import { looksMinified } from '@common/minified';

/**
 * A response's text as its tab starts: JSON that arrived on one line (or minified) is formatted when
 * the setting says so, as text, so numbers and key order stay as the server sent them. Anything that
 * isn't JSON stays as it came.
 */
export async function responseText(text: string, prettyPrint: boolean): Promise<string> {
  if (!prettyPrint || (text.includes('\n') && !looksMinified(text))) return text;
  try {
    JSON.parse(text);
  } catch {
    return text;
  }
  return formatCode(text, RESPONSE_KIND).catch(() => text);
}
