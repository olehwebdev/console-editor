import type { SourceMapRequestOf, SourceMapWorkerReplies } from '../../types';
import { readSource } from '../readSource';
import type { LoadedMaps } from '../types';
import { functionAt } from './functionAt';
import { hookLayout } from './hookLayout';
import { offsetOf } from './offsetOf';
import { parseOriginal } from './parseOriginal';

/**
 * The names of a React component's hooks, read off its original: the function defined at a place of it
 * (1-based line and column, as `toOriginalRaw` answers), its hook calls laid out as React keeps them.
 */
export function hookNames(maps: LoadedMaps, request: SourceMapRequestOf<'hookNames'>): SourceMapWorkerReplies['hookNames'] {
  const read = readSource(maps, { type: 'content', bundleUrl: request.bundleUrl, url: request.url });
  if ('miss' in read) return read;
  const file = parseOriginal(request.url, read.content);
  const offset = offsetOf(read.content, request.line, request.column - 1);
  const fn = file && offset !== null ? functionAt(file, offset) : null;
  return { names: fn && file ? hookLayout(fn, file).names : [] };
}
