import { ELLIPSIS } from './constants';
import type { ObjectPreview } from './types';

/** A map's or set's preview: `Map(2) {"a" => 1, "b" => 2}`, `Set(1) {"x"}`. */
export function entriesPreview(preview: ObjectPreview): string {
  const items = (preview.entries ?? []).map(({ key, value }) =>
    key ? `${key.description ?? key.type} => ${value.description ?? value.type}` : (value.description ?? value.type),
  );
  if (preview.overflow) items.push(ELLIPSIS);
  return `${preview.description ?? preview.subtype} {${items.join(', ')}}`;
}
