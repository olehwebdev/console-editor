import type { StackFrame } from '@common/types';
import { isLibrarySource } from '@/shared/lib';
import type { OriginalPlace } from '../model/store';
import { locationKey } from './locationKey';

/**
 * The call of a dispatch's stack that is the app's own: the first whose original is known and isn't a
 * library's (under node_modules). With no map to tell, the first call; null for an empty stack.
 */
export function appFrame(stack: readonly StackFrame[], origins: Record<string, OriginalPlace | null>): StackFrame | null {
  const traced = stack.filter((frame) => origins[locationKey(frame)]);
  if (!traced.length) return stack[0] ?? null;
  return traced.find((frame) => !isLibrarySource(origins[locationKey(frame)]!.url)) ?? null;
}
