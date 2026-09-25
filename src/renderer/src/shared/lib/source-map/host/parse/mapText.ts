import { HTML_START, XSSI_PREFIX } from '../../constants';
import type { Parsed } from '../types';
import { invalidMap } from './invalidMap';

const NEWLINE = '\n';

/**
 * A map's JSON: decoded as UTF-8 (a BOM dropped), past an anti-XSSI `)]}'` line. A page (an app's
 * fallback route answering the map's URL) is said to be one, not reported as broken JSON.
 */
export function mapText(bytes: Uint8Array): Parsed<unknown> {
  let text = new TextDecoder().decode(bytes);
  if (text.startsWith(XSSI_PREFIX)) {
    const newline = text.indexOf(NEWLINE);
    text = newline === -1 ? '' : text.slice(newline + 1);
  }
  if (text.trimStart().startsWith(HTML_START)) return { ok: false, failure: 'not-a-map', detail: '' };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch (err) {
    return invalidMap(err instanceof Error ? err.message : String(err));
  }
}
