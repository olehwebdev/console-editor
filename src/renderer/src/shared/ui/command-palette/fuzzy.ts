/**
 * Small fuzzy matcher for the command palette: contiguous matches beat
 * scattered ones, word starts (after space, `/`, `.`, `-`, `_`, camelCase)
 * beat mid-word letters, earlier beats later. Returns the matched character
 * positions so the label can highlight them.
 */
export interface FuzzyMatch {
  score: number;
  /** Indices into the original text of every matched character (ascending). */
  indices: number[];
}

const SEPARATOR = /[\s/\\.\-_:?#=&@]/;
const SURROGATE = /[\uD800-\uDFFF]/;

/**
 * Lower-cases without changing the length, so an index into the result is an
 * index into the input. A character whose lower case is longer (`'İ'` → `'i̇'`,
 * `i` + a combining dot) keeps only the base letter, or itself if that isn't a
 * whole character.
 */
function lowerSameLength(text: string): string {
  let lower = '';
  for (const char of text) {
    const next = char.toLowerCase();
    if (next.length === char.length) lower += next;
    else if (char.length === 1 && !SURROGATE.test(next[0]!)) lower += next[0]!;
    else lower += char;
  }
  return lower;
}

function isWordStart(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text[index - 1];
  const char = text[index];
  if (prev === undefined || char === undefined) return false;
  if (SEPARATOR.test(prev)) return true;
  // camelCase / PascalCase boundary.
  return prev === prev.toLowerCase() && char !== char.toLowerCase();
}

/** True when `query[from..]` is a subsequence of `lower[start..]`. */
function fits(query: string, from: number, lower: string, start: number): boolean {
  let q = from;
  for (let i = start; i < lower.length && q < query.length; i++) {
    if (lower[i] === query[q]) q++;
  }
  return q === query.length;
}

/** Normalizes a raw query: lower-case, whitespace removed. */
export function normalizeQuery(query: string): string {
  return lowerSameLength(query).replace(/\s+/g, '');
}

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
    const score = 1000 + (direct === 0 ? 400 : boundary ? 200 : 0) - direct * 2 + (query.length / lower.length) * 100;
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
    return { score: 900 - indices[0]! * 2, indices };
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
    score += 10;
    if (isWordStart(text, i)) score += 30;
    if (k > 0 && indices[k - 1] === i - 1) score += 20;
    if (k > 0) score -= Math.min(i - indices[k - 1]! - 1, 10);
  }
  score -= indices[0]! * 0.5;
  // Scattered matches always rank below contiguous ones.
  return { score: Math.min(score, 800), indices };
}
