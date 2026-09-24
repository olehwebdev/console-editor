// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { TRIGGER_GAP } from './constants';
import type { MenuAnchor, Placement } from './types';

export function initialPlacement(anchor: MenuAnchor): Placement {
  if (anchor.type === 'point') return { left: anchor.x, top: anchor.y, originX: 0, originY: 0 };
  const rect = anchor.element.current?.getBoundingClientRect();
  return { left: rect?.left ?? 0, top: (rect?.bottom ?? 0) + TRIGGER_GAP, originX: 0, originY: 0 };
}
