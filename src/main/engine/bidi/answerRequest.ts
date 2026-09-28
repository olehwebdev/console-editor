import { decideRequest, type RequestDecision } from '../answering';
import { holdFor } from '../InterceptionEngine/holdFor';
import { BIDI } from './constants';
import { provideResponse } from './provideResponse';
import { requestOf } from './requestOf';
import { resourceTypeOf } from './resourceTypeOf';
import type { BidiAnswerContext, BidiNetworkEvent } from './types';

/** How each decision is carried out over BiDi. */
const CARRY_OUT: { [A in RequestDecision['action']]: (ctx: BidiAnswerContext, request: string, decision: Extract<RequestDecision, { action: A }>) => Promise<unknown> } = {
  fail: ({ connection }, request) => connection.send(BIDI.network.failRequest, { request }),
  continue: ({ connection }, request) => connection.send(BIDI.network.continueRequest, { request }),
  answer: async ({ connection }, request, { head, body, delayMs }) => {
    await holdFor(delayMs);
    await provideResponse(connection, request, head, body);
  },
};

/** Answers a request paused before it is sent, as {@link decideRequest} decides. */
export async function answerRequest(ctx: BidiAnswerContext, { request: data }: BidiNetworkEvent): Promise<void> {
  const decision = decideRequest(ctx, requestOf(data), resourceTypeOf(data));
  const carryOut = CARRY_OUT[decision.action] as (ctx: BidiAnswerContext, request: string, decision: RequestDecision) => Promise<unknown>;
  await carryOut(ctx, data.request, decision);
}
