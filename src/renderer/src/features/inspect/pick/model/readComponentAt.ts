import { followUp } from './followUp';
import { inspectDepth } from './inspectDepth';

/** Reads a component of the picked element's chain as it is now, shows it, and follows it up as a pick is (`followUp`). */
export async function readComponentAt(depth: number): Promise<void> {
  const component = await inspectDepth(depth);
  if (component) followUp.component?.(component);
}
