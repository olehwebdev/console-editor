import { SWITCH_LIKE_COMPARISONS } from './constants.ts';

/** The value compared often enough to make a chain a switch in disguise, if any. */
export function repeatedSubject(subjects: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const subject of subjects) counts.set(subject, (counts.get(subject) ?? 0) + 1);
  return [...counts].find(([, count]) => count >= SWITCH_LIKE_COMPARISONS)?.[0] ?? null;
}
