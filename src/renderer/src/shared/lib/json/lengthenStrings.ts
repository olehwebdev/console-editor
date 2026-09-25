import { parseJson, type TextEdit } from '@common/json';
import { KEEPS_LENGTH } from './constants';
import { jsonValues } from './jsonValues';
import { lengthened } from './lengthened';

/** Makes every text value in a JSON text much longer (keys, links, ids and dates stay), as edits that leave the rest as it is. Throws for text that isn't JSON. */
export function lengthenStrings(text: string): TextEdit[] {
  const edits: TextEdit[] = [];
  jsonValues(parseJson(text), (node) => {
    if (node.kind === 'string' && !KEEPS_LENGTH.test(node.value)) edits.push({ start: node.start, end: node.end, text: JSON.stringify(lengthened(node.value)) });
  });
  return edits;
}
