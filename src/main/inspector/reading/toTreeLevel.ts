import { INSPECT_FRAMEWORKS, type CodeLocation, type ComponentTreeLevel } from '../../../shared/types';
import { MAX_TREE_NODES } from '../constants';
import { cleanText } from './cleanText';

type Item = Record<string, unknown>;

/** What the adapter said of a level of the tree (`tree`), checked like any input from the page. Null if it said nothing. */
export function toTreeLevel(raw: unknown, locations: Array<CodeLocation | null>, at: { frameId: string; path: number[] }): ComponentTreeLevel | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Item;
  const count = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0);
  const nodes = (Array.isArray(data.nodes) ? data.nodes : [])
    .slice(0, MAX_TREE_NODES)
    .filter((item): item is Item => !!item && typeof item === 'object')
    .flatMap((item) => {
      const framework = INSPECT_FRAMEWORKS.find((f) => f === item.framework);
      const fn = typeof item.fn === 'number' && Number.isInteger(item.fn) && item.fn >= 0 ? item.fn : -1;
      if (!framework) return [];
      return [{ framework, name: cleanText(item.name), key: typeof item.key === 'string' ? cleanText(item.key) : null, location: locations[fn] ?? null, children: count(item.children) }];
    });
  return { ...at, nodes, more: count(data.more) };
}
