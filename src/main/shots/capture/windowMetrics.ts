import { CDP } from '../../engine/constants';
import type { CdpTransport } from '../../engine/cdp';
import { WINDOW_METRICS } from '../constants';

/**
 * The page's window in CSS pixels (scrollbars included, as a window size is given) and its device pixel ratio, asked
 * of its main world: 0 × 0 at 1× when that fails, or the answer isn't numbers (the page can redefine them).
 */
export async function windowMetrics(transport: CdpTransport): Promise<{ width: number; height: number; ratio: number }> {
  const answer = await transport
    .send<{ result: { value?: unknown } }>(CDP.Runtime.evaluate, { expression: WINDOW_METRICS, returnByValue: true })
    .then(({ result }) => result.value)
    .catch(() => null);
  const [width, height, ratio] = Array.isArray(answer) && answer.every((n) => typeof n === 'number' && n > 0) ? (answer as number[]) : [0, 0, 1];
  return { width, height, ratio };
}
