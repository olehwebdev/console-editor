import { countChildren, type JsonTreeRow } from '@/shared/lib';
import { CONTAINER_LABELS, MAX_SHOWN_CHARS } from './constants';

/** What a row shows for its value: a value as written, an object's or array's size. */
export function valueLabel({ node }: JsonTreeRow, text: string): string {
  const container = CONTAINER_LABELS[node.kind];
  if (container) return container(countChildren(node));
  return text.slice(node.start, Math.min(node.end, node.start + MAX_SHOWN_CHARS));
}
