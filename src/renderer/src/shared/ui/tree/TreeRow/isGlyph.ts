// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { IconGlyph } from '@/shared/ui/icon';

export function isGlyph(value: unknown): value is IconGlyph {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]) && typeof value[0][0] === 'string';
}
