import type { ConsoleLocation } from '../../shared/types';
import { MAX_STACK_FRAMES } from './constants';
import { toLocation } from './toLocation';
import type { StackTrace } from './types';

/** The stack as locations, innermost first; undefined when there is none. */
export function stackOf(trace: StackTrace | undefined): ConsoleLocation[] | undefined {
  const frames = trace?.callFrames ?? [];
  return frames.length ? frames.slice(0, MAX_STACK_FRAMES).map(toLocation) : undefined;
}
