import type { AlignmentFit } from '../../types';
import type { Alignment } from '../types';
import { EDITED } from './constants';
import { lowerBound } from './lowerBound';
import { translateIndex } from './translateIndex';

/**
 * Where a raw bundle offset is in the tab's text. On whitespace (inside a string, say, which
 * pretty-printing keeps as it is) it keeps its distance from the code before it, short of the code
 * after it. Inside the edited middle it lands where the edits start.
 */
export function rawToView(rawCode: Uint32Array, alignment: Alignment, rawOffset: number): { offset: number; fit: AlignmentFit } {
  const { code, prefix, suffix, text } = alignment;
  const toView = (index: number) => translateIndex(index, rawCode.length, code.length, prefix, suffix);
  const editedStart = { offset: prefix < code.length ? code[prefix]! : text.length, fit: 'edited' as const };
  const next = lowerBound(rawCode, rawOffset);
  if (next < rawCode.length && rawCode[next] === rawOffset) {
    const index = toView(next);
    return index === EDITED ? editedStart : { offset: code[index]!, fit: 'exact' };
  }
  const before = next > 0 ? toView(next - 1) : null;
  const after = next < rawCode.length ? toView(next) : null;
  if (before === EDITED || after === EDITED) return editedStart;
  const start = before === null ? 0 : code[before]!;
  const rawStart = before === null ? 0 : rawCode[next - 1]!;
  const limit = after === null ? text.length : code[after]!;
  return { offset: Math.max(0, Math.min(start + (rawOffset - rawStart), limit - 1)), fit: 'exact' };
}
