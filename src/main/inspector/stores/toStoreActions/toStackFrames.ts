import type { StackFrame } from '../../../../shared/types';
import { LOADED_SCRIPT } from '../../constants';
import { cleanText } from '../../reading/cleanText';
import { itemsOf } from '../../renders/toRenderCommits/itemsOf';
import { MAX_FRAME_URL, MAX_STACK_FRAMES } from '../constants';
import { isPlace } from './isPlace';

/** The calls of a dispatch's stack the page sent, checked: each in a file the page loaded, at a place in it. */
export function toStackFrames(raw: unknown): StackFrame[] {
  return itemsOf(raw, MAX_STACK_FRAMES).flatMap((frame) => {
    const { url, line, column } = frame;
    if (typeof url !== 'string' || url.length > MAX_FRAME_URL || !LOADED_SCRIPT.test(url) || !isPlace(line) || !isPlace(column)) return [];
    return [{ name: cleanText(frame.name), url, line, column }];
  });
}
