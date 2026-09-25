import type { CodeLocation } from '@common/types';
import type { OriginalPlace } from '@/entities/inspector';
import { askLoadedMap } from './askLoadedMap';
import { SCRIPT_KIND } from './constants';
import { ensureSourceMap } from './ensureSourceMap';
import { isMiss } from './isMiss';

/**
 * The original a place in a script as served comes from, through its source map (loaded quietly: a bundle
 * with none just has no original). Null when there is none.
 */
export async function findOriginal(location: CodeLocation): Promise<OriginalPlace | null> {
  const state = await ensureSourceMap(location.url, SCRIPT_KIND);
  if (state.status !== 'ready') return null;
  const reply = await askLoadedMap({ type: 'toOriginalRaw', bundleUrl: location.url, line: location.line, column: location.column }, { kind: SCRIPT_KIND });
  if (isMiss(reply)) return null;
  return { bundleUrl: location.url, url: reply.url, line: reply.line, column: reply.column, name: reply.name, rawOffset: reply.rawOffset };
}
