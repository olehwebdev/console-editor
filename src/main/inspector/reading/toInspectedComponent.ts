import { STACK_BUILDS } from '../../../shared/stackLibraries';
import { INSPECT_FRAMEWORKS, STATE_KINDS, type CodeLocation, type InspectedComponent, type InspectedValue } from '../../../shared/types';
import { MAX_LIST_ITEMS } from '../constants';
import { cleanText } from './cleanText';
import { toInspectedElement } from './toInspectedElement';

type Item = Record<string, unknown>;

/**
 * What the adapter said of a component (`describe`), checked like any input from
 * the page: known frameworks, builds and state kinds only, text as labels, lists
 * capped. Functions are named by index; `locations` says where each is defined.
 */
export function toInspectedComponent(raw: unknown, locations: Array<CodeLocation | null>, pick: { pickId: string; frameId: string | null }): InspectedComponent {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Item;
  const at = (index: unknown) => (typeof index === 'number' && Number.isInteger(index) && index >= 0 ? (locations[index] ?? null) : null);
  const list = <T>(value: unknown, map: (item: Item) => T): T[] =>
    Array.isArray(value) ? value.slice(0, MAX_LIST_ITEMS).filter((item): item is Item => !!item && typeof item === 'object').map(map) : [];
  const value = (item: Item): InspectedValue => ({ name: cleanText(item.name), preview: cleanText(item.preview), location: at(item.fn) });
  const optional = (text: unknown) => (typeof text === 'string' ? cleanText(text) : null);
  return {
    ...pick,
    framework: INSPECT_FRAMEWORKS.find((f) => f === data.framework) ?? null,
    build: STACK_BUILDS.find((b) => b === data.build) ?? null,
    element: toInspectedElement(data.element),
    chain: list(data.chain, (link) => ({ name: cleanText(link.name), key: optional(link.key), location: at(link.fn) })),
    depth: typeof data.depth === 'number' && Number.isInteger(data.depth) && data.depth >= 0 ? data.depth : 0,
    props: list(data.props, value),
    state: list(data.state, (item) => ({ ...value(item), kind: STATE_KINDS.find((k) => k === item.kind) ?? 'other' })),
    context: list(data.context, (item) => ({ name: cleanText(item.name), preview: cleanText(item.preview), provider: optional(item.provider), location: at(item.fn) })),
    handlers: list(data.handlers, (item) => ({ name: cleanText(item.name), function: cleanText(item.function), location: at(item.fn) })),
  };
}
