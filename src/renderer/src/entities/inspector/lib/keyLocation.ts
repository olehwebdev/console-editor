import type { CodeLocation } from '@common/types';

/** The pieces of a `locationKey`: its script's URL (which may hold a `#` itself), line and column. */
const KEY = /^(.*)#(\d+):(\d+)$/;

/** The code location a `locationKey` stands for; null for anything else. */
export function keyLocation(key: string): CodeLocation | null {
  const match = KEY.exec(key);
  return match ? { url: match[1]!, line: Number(match[2]), column: Number(match[3]) } : null;
}
