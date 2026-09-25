import { parseJson, type JsonNode, type TextEdit } from '@common/json';
import { CHILD_SPANS } from './constants';

/**
 * Turns the value at `offset` into null: the innermost one there, or the value of the key there. None
 * when it is null already. Throws for text that isn't JSON.
 */
export function nullAt(text: string, offset: number): TextEdit[] {
  let node: JsonNode = parseJson(text);
  for (;;) {
    const within = CHILD_SPANS[node.kind](node as never).find((c) => offset >= c.from && offset <= c.to);
    if (!within) break;
    node = within.value;
  }
  return node.kind === 'null' ? [] : [{ start: node.start, end: node.end, text: 'null' }];
}
