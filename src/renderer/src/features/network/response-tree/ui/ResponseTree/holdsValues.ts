import type { JsonTreeRow } from '@/shared/lib';

/** Whether a row is an object or array (it opens and closes). */
export function holdsValues(row: JsonTreeRow): boolean {
  return row.node.kind === 'object' || row.node.kind === 'array';
}
