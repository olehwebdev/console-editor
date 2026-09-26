import type { ScriptCoverage } from '../../shared/types';
import { LOADED_SCRIPT, MAX_UNMAPPED } from './constants';
import type { ScriptRecord } from './reading/ScriptUrls';

/** How many of a frame's scripts loaded from files name a source map; its document's inline scripts (which share its URL) are left out. */
export function scriptCoverage(scripts: readonly ScriptRecord[], documentUrl: string): ScriptCoverage {
  const byUrl = new Map<string, boolean>();
  for (const script of scripts) {
    if (!LOADED_SCRIPT.test(script.url) || script.url === documentUrl) continue;
    byUrl.set(script.url, (byUrl.get(script.url) ?? false) || !!script.sourceMap);
  }
  const unmapped = [...byUrl].filter(([, mapped]) => !mapped).map(([url]) => url);
  return { scripts: byUrl.size, mapped: byUrl.size - unmapped.length, unmapped: unmapped.slice(0, MAX_UNMAPPED) };
}
