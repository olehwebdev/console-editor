import { rename } from 'node:fs/promises';
import { BROKEN_SUFFIX } from './constants';
import type { ReadRules } from './types';

/**
 * Moves an unreadable rules.json aside (replacing an older one), so it is kept
 * and the store can start empty. If it can't be moved, the store is locked
 * instead: writing would replace it.
 */
export async function setAsideIndex(indexPath: string): Promise<Pick<ReadRules, 'setAside' | 'locked'>> {
  const broken = `${indexPath}${BROKEN_SUFFIX}`;
  try {
    await rename(indexPath, broken);
    console.warn(`${indexPath} could not be read; it was kept as ${broken} and the app starts with no rules`);
    return { setAside: broken };
  } catch (err) {
    const locked = `${indexPath} isn't valid and couldn't be moved aside (${(err as Error).message}); rules can't be changed until it is fixed or removed`;
    console.warn(locked);
    return { locked };
  }
}
