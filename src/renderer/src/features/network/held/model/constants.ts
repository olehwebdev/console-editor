import type { BreakpointStage, HeldAction, HeldRequest } from '@common/types';

/** The body a held request's tab shows at each stage: what it is to send, or what it got back. */
export const HELD_BODY: Record<BreakpointStage, (held: HeldRequest) => string | undefined> = {
  request: (held) => held.requestBody,
  response: (held) => held.response?.body,
};

/** Lets a held request go as it would have. */
export const CONTINUE: HeldAction = { type: 'continue' };
