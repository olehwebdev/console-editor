import { parseJson, type TextEdit } from '@common/json';
import { jsonValues } from './jsonValues';

/** Empties every list in a JSON text (the outermost ones: what they held goes with them), as edits that leave the rest as it is. Throws for text that isn't JSON. */
export function emptyArrays(text: string): TextEdit[] {
  const edits: TextEdit[] = [];
  jsonValues(parseJson(text), (node) => {
    if (node.kind !== 'array') return;
    if (node.items.length) edits.push({ start: node.start, end: node.end, text: '[]' });
    return false;
  });
  return edits;
}
