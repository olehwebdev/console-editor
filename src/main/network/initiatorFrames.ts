import type { StackFrame } from '../../shared/types';
import { LOADED_FILE, MAX_INITIATOR_FRAMES } from './constants';
import type { RequestInitiator } from './types';

/**
 * The stack of the script that sent a request, innermost first, as `Network.requestWillBeSent` tells it:
 * the calls in files the page loaded, through the async parents when Chromium recorded them. Empty when no
 * script sent it (the parser, a preload, the user).
 */
export function initiatorFrames(initiator: RequestInitiator | undefined): StackFrame[] {
  const frames: StackFrame[] = [];
  for (let stack = initiator?.stack; stack && frames.length < MAX_INITIATOR_FRAMES; stack = stack.parent) {
    for (const call of stack.callFrames) {
      if (frames.length >= MAX_INITIATOR_FRAMES) break;
      if (LOADED_FILE.test(call.url)) frames.push({ name: call.functionName, url: call.url, line: call.lineNumber, column: call.columnNumber });
    }
  }
  return frames;
}
