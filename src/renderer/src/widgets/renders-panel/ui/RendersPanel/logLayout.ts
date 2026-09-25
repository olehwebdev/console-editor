import type { RenderCommit } from '@common/types';
import type { LogLayout } from './types';

/** The commits as rows: each one's heading, a row per component listed, and one for the count of the rest when there are more. */
export function logLayout(commits: readonly RenderCommit[]): LogLayout {
  const starts: number[] = [];
  let count = 0;
  for (const commit of commits) {
    starts.push(count);
    count += 1 + commit.components.length + (commit.more ? 1 : 0);
  }
  return { starts, count };
}
