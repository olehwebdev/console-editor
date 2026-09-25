import { INSPECT_FRAMEWORKS, type InspectHover } from '../../../shared/types';
import { MAX_LIST_ITEMS } from '../constants';
import { cleanText } from './cleanText';
import { toInspectedElement } from './toInspectedElement';

/** What the adapter said of the element under the pointer (`summary`), checked like any input from the page. */
export function toInspectHover(raw: unknown): InspectHover | null {
  if (!raw || typeof raw !== 'object') return null;
  const summary = raw as Record<string, unknown>;
  return {
    element: toInspectedElement(summary.element),
    framework: INSPECT_FRAMEWORKS.find((f) => f === summary.framework) ?? null,
    chain: Array.isArray(summary.chain) ? summary.chain.slice(0, MAX_LIST_ITEMS).map(cleanText) : [],
  };
}
