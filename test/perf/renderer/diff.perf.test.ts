/**
 * How long comparing two tall captures pixel by pixel takes, in the diff worker's function: 1440 × 10,000 pixels of
 * "text" (small dark boxes with smoothed edges), its edges smoothed another way in the second image (as another browser
 * draws them) and a few boxes really changed, so most of the time goes to telling anti-aliasing apart. It prints the
 * median of a few runs, and fails only past a budget well above what a laptop measures.
 */
import { describe, expect, it } from 'vitest';
import { diffPixels } from '@/features/shot/compare/lib/diffPixels';

const WIDTH = 1440;
const HEIGHT = 10_000;
const RUNS = 3;
const BUDGET_MS = 15_000;

/** The runner's stderr, where the results go (a passing test's console is hidden); this file has no Node types. */
const { stderr } = (globalThis as unknown as { process: { stderr: { write(text: string): void } } }).process;

/** A page of "text": 12 × 8 boxes on a 20 px grid, their edges grey (`edge`), every 97th box missing when `changed`. */
function page(edge: number, changed: boolean) {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4).fill(255);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const [cx, cy] = [x % 20, y % 20];
      if (cx > 13 || cy > 9 || (changed && (Math.floor(x / 20) + Math.floor(y / 20) * 72) % 97 === 0)) continue;
      const value = cx === 0 || cx === 13 || cy === 0 || cy === 9 ? edge : 0;
      const i = (y * WIDTH + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value;
    }
  }
  return { data, width: WIDTH, height: HEIGHT };
}

describe('comparing tall captures', () => {
  it('compares 1440 × 10,000 pixels, telling anti-aliasing apart, within its budget', () => {
    const [a, b] = [page(110, false), page(170, true)];
    const times: number[] = [];
    let result = diffPixels(a, b, { x: 0, y: 0 }, 0.1);
    for (let run = 0; run < RUNS; run++) {
      const start = performance.now();
      result = diffPixels(a, b, { x: 0, y: 0 }, 0.1);
      times.push(performance.now() - start);
    }
    const median = times.sort((x, y) => x - y)[Math.floor(RUNS / 2)];
    stderr.write(`\n${'diff 1440 × 10,000 (anti-aliasing told apart)'.padEnd(64)} ${`${median.toFixed(0)} ms`.padStart(9)}   budget ${BUDGET_MS} ms\n`);
    stderr.write(`  ${result.differing} differing, ${result.smoothed} anti-aliasing, ${result.regions.length} areas\n`);
    expect(result.smoothed).toBeGreaterThan(result.differing);
    expect(median).toBeLessThan(BUDGET_MS);
  });
});
