import { RENDER_REASONS, type RenderReason } from '../../../../shared/types';
import { MAX_CHANGES } from '../../constants';
import { cleanText } from '../../reading/cleanText';
import { itemsOf } from './itemsOf';
import type { Item } from './types';

/** A reason the page gave for a render, if it is one the app knows, with what changed as labels. */
export function toReason(item: Item): RenderReason[] {
  const kind = RENDER_REASONS.find((k) => k === item.kind);
  return kind ? [{ kind, changes: itemsOf(item.changes, MAX_CHANGES).map((c) => ({ name: cleanText(c.name), from: cleanText(c.from), to: cleanText(c.to) })) }] : [];
}
