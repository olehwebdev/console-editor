// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { NativeViewRect } from '@/shared/lib';
import type { Box } from './types';

export function overlapArea(box: Box, width: number, height: number, rect: NativeViewRect): number {
  const x = Math.min(box.left + width, rect.x + rect.width) - Math.max(box.left, rect.x);
  const y = Math.min(box.top + height, rect.y + rect.height) - Math.max(box.top, rect.y);
  return x > 0 && y > 0 ? x * y : 0;
}
