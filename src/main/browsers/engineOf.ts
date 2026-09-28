import { basename } from 'node:path';
import type { BrowserEngine } from '../../shared/types';
import { ENGINE_PATTERNS } from './constants';

/** A browser's engine, from its names (launcher id, program path, app or registry name): the first pattern any of them matches. */
export function engineOf(names: (string | null | undefined)[]): BrowserEngine {
  const known = names.filter((name): name is string => !!name).map((name) => basename(name));
  for (const [pattern, engine] of ENGINE_PATTERNS) if (known.some((name) => pattern.test(name))) return engine;
  return 'unknown';
}
