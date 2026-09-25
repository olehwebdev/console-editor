import type { ViewRef } from '../../types';
import type { Alignment, LoadedMap } from '../types';
import { codeOffsets } from './codeOffsets';

/**
 * The map's raw bundle (`raw`, its text) lined up with a tab's text: cached on the entry for the
 * tab's version (`view.key`), and built only when the text came with the request (else null: the
 * client must send it).
 */
export function alignmentFor(entry: LoadedMap, raw: string, view: ViewRef): Alignment | null {
  if (entry.alignment?.key === view.key) return entry.alignment;
  if (view.text === undefined) return null;
  const rawCode = (entry.rawCode ??= codeOffsets(raw));
  const text = view.text;
  const code = codeOffsets(text);
  const shortest = Math.min(rawCode.length, code.length);
  let prefix = 0;
  while (prefix < shortest && raw.charCodeAt(rawCode[prefix]!) === text.charCodeAt(code[prefix]!)) prefix++;
  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    raw.charCodeAt(rawCode[rawCode.length - 1 - suffix]!) === text.charCodeAt(code[code.length - 1 - suffix]!)
  ) {
    suffix++;
  }
  entry.alignment = { key: view.key, text, code, prefix, suffix };
  return entry.alignment;
}
