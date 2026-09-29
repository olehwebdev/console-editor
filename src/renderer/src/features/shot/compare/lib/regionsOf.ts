import type { Rect } from '@common/types';
import { MAX_REGIONS, REGION_CELL } from './constants';

/**
 * Boxes around the areas that differ: the cells of a `REGION_CELL` grid holding a differing pixel, joined with their
 * neighbours (sides and corners) into areas, top to bottom, at most `MAX_REGIONS`.
 */
export function regionsOf(cells: Uint8Array, columns: number, rows: number, width: number, height: number): Rect[] {
  const seen = new Uint8Array(cells.length);
  const regions: Rect[] = [];
  for (let start = 0; start < cells.length && regions.length < MAX_REGIONS; start++) {
    if (!cells[start] || seen[start]) continue;
    let [left, top, right, bottom] = [columns, rows, 0, 0];
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const cell = stack.pop()!;
      const [cx, cy] = [cell % columns, Math.floor(cell / columns)];
      [left, top, right, bottom] = [Math.min(left, cx), Math.min(top, cy), Math.max(right, cx), Math.max(bottom, cy)];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const [nx, ny] = [cx + dx, cy + dy];
          const next = ny * columns + nx;
          if (nx < 0 || ny < 0 || nx >= columns || ny >= rows || !cells[next] || seen[next]) continue;
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    const x = left * REGION_CELL;
    const y = top * REGION_CELL;
    regions.push({ x, y, width: Math.min(width, (right + 1) * REGION_CELL) - x, height: Math.min(height, (bottom + 1) * REGION_CELL) - y });
  }
  return regions.sort((a, b) => a.y - b.y || a.x - b.x);
}
