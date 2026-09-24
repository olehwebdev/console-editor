// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { fuzzyMatch, normalizeQuery } from '../fuzzy';
import type { CommandGroup, Result } from './types';

/** Keywords and hints count for less than the label and don't highlight. */
const SECONDARY_WEIGHT = 0.6;

export function filterGroups(groups: CommandGroup[], rawQuery: string): { heading: string; results: Result[] }[] {
  const query = normalizeQuery(rawQuery);
  if (!query) {
    return groups
      .filter((group) => group.items.length > 0)
      .map((group) => ({ heading: group.heading, results: group.items.map((item) => ({ item, indices: [], score: 0 })) }));
  }
  const sections: { heading: string; results: Result[]; best: number }[] = [];
  for (const group of groups) {
    const results: Result[] = [];
    for (const item of group.items) {
      const onLabel = fuzzyMatch(query, item.label);
      if (onLabel) {
        results.push({ item, indices: onLabel.indices, score: onLabel.score });
        continue;
      }
      let best = -Infinity;
      for (const extra of [...(item.keywords ?? []), item.hint ?? '']) {
        const match = extra ? fuzzyMatch(query, extra) : null;
        if (match) best = Math.max(best, match.score * SECONDARY_WEIGHT);
      }
      if (best > -Infinity) results.push({ item, indices: [], score: best });
    }
    if (results.length === 0) continue;
    results.sort((a, b) => b.score - a.score);
    sections.push({ heading: group.heading, results, best: results[0]!.score });
  }
  // Best group first, like the best row first within a group.
  return sections.sort((a, b) => b.best - a.best);
}
