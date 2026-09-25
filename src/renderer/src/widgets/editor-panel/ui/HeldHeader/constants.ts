import type { BreakpointStage } from '@common/types';

/** What the badge says a held request waits for, at each stage. */
export const HELD_BADGES: Record<BreakpointStage, string> = {
  request: 'Paused before sending',
  response: 'Paused at the response',
};
