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
