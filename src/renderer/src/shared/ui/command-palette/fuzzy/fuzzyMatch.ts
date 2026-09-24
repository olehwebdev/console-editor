import { fits } from './fits';
import { isWordStart } from './isWordStart';
import { lowerSameLength } from './lowerSameLength';
import type { FuzzyMatch } from './types';

/** A contiguous run: bonus for where it starts, less the later it starts, more the more of the text it covers. */
const RUN = { base: 1000, atStart: 400, atWordStart: 200, perOffset: 2, coverage: 100 } as const;
/** A contiguous run that spans whitespace in the text ranks just below. */
const SPANNING_RUN = { base: 900, perOffset: 2 } as const;
/** A scattered subsequence scores per character: word starts and adjacent letters add, gaps (up to `maxGap`) cost. */
const SCATTERED = { perChar: 10, wordStart: 30, adjacent: 20, maxGap: 10, perOffset: 0.5, max: 800 } as const;

/** Matches an already-normalized query (see `normalizeQuery`) against `text`. */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  if (!query) return { score: 0, indices: [] };
  // Same length as `text`: match positions below index `text` directly.
  const lower = lowerSameLength(text);
  if (query.length > lower.length) return null;

  // Contiguous run (spaces in the text are allowed inside it: "saveov" ~ "Save ov…").
  const compact = lower.replace(/\s/g, '');
  const direct = lower.indexOf(query);
  if (direct >= 0) {
    const indices = Array.from({ length: query.length }, (_, i) => direct + i);
    const boundary = isWordStart(text, direct);
    const score =
      RUN.base +
      (direct === 0 ? RUN.atStart : boundary ? RUN.atWordStart : 0) -
      direct * RUN.perOffset +
      (query.length / lower.length) * RUN.coverage;
    return { score, indices };
  }
  if (compact.includes(query) && compact.length !== lower.length) {
    // Map a whitespace-spanning run back to original indices.
    const indices: number[] = [];
    let q = 0;
    const startInCompact = compact.indexOf(query);
    let seen = 0;
    for (let i = 0; i < lower.length && q < query.length; i++) {
      if (/\s/.test(lower[i]!)) continue;
      if (seen >= startInCompact) {
        indices.push(i);
        q++;
      }
      seen++;
    }
    return { score: SPANNING_RUN.base - indices[0]! * SPANNING_RUN.perOffset, indices };
  }

  // Scattered subsequence, preferring word starts when the rest still fits.
  const indices: number[] = [];
  let pos = 0;
  for (let q = 0; q < query.length; q++) {
    const char = query[q]!;
    let first = -1;
    let boundary = -1;
    for (let i = pos; i < lower.length; i++) {
      if (lower[i] !== char) continue;
      if (first < 0) first = i;
      if (isWordStart(text, i) && fits(query, q + 1, lower, i + 1)) {
        boundary = i;
        break;
      }
    }
    if (first < 0) return null;
    const pick = boundary >= 0 ? boundary : first;
    indices.push(pick);
    pos = pick + 1;
  }

  let score = 0;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k]!;
    score += SCATTERED.perChar;
    if (isWordStart(text, i)) score += SCATTERED.wordStart;
    if (k > 0 && indices[k - 1] === i - 1) score += SCATTERED.adjacent;
    if (k > 0) score -= Math.min(i - indices[k - 1]! - 1, SCATTERED.maxGap);
  }
  score -= indices[0]! * SCATTERED.perOffset;
  // Scattered matches always rank below contiguous ones.
  return { score: Math.min(score, SCATTERED.max), indices };
}
