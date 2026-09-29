import type { PageDesign } from '../../overlay';

/**
 * Runs `task` (a capture) with the design laid aside (hidden, the page at its own width) when there is one, then lays
 * back the one there is by then.
 */
export async function withDesignAside<R>(current: () => PageDesign | null, lay: (design: PageDesign, aside: boolean) => Promise<void>, task: () => Promise<R>): Promise<R> {
  const design = current();
  if (!design) return task();
  await lay(design, true);
  try {
    return await task();
  } finally {
    const now = current();
    if (now) await lay(now, false);
  }
}
