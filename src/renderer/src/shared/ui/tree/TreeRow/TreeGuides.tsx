// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { PAD, TREE_INDENT, TWISTIE } from './constants';

/** A row's faint vertical indent guides: one per ancestor level, under that level's chevron center. */
export function TreeGuides({ depth }: { depth: number }) {
  return Array.from({ length: depth }, (_, level) => (
    <span
      key={level}
      aria-hidden
      className="pointer-events-none absolute inset-y-0 w-px bg-line"
      style={{ left: PAD + level * TREE_INDENT + TWISTIE / 2 - 1 }}
    />
  ));
}
