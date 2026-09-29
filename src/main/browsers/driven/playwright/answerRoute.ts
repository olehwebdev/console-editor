import type { Route } from 'playwright-core';
import { decideRequest, ruledHead, type AnswerContext, type RequestDecision } from '../../../engine/answering';
import { holdFor } from '../../../engine/InterceptionEngine/holdFor';
import { findResponseRules, type PausedRequest } from '../../../engine/rules';
import { BLOCKED, OTHER_RESOURCE, RESOURCE_TYPES } from './constants';
import { headersRecord } from './headersRecord';

/** How each decision is carried out through Playwright's route. */
const CARRY_OUT: { [A in RequestDecision['action']]: (ctx: AnswerContext, route: Route, request: PausedRequest, type: string, decision: Extract<RequestDecision, { action: A }>) => Promise<void> } = {
  fail: (_ctx, route) => route.abort(BLOCKED),
  answer: async (_ctx, route, _request, _type, { head, body, delayMs }) => {
    await holdFor(delayMs);
    await route.fulfill({ status: head.status, headers: headersRecord(head.headers), body });
  },
  // Sent on; fetched here first only when a response rule takes it, to change its head.
  continue: async (ctx, route, request, type) => {
    if (!findResponseRules(ctx.sources.getRules(), request.url, type, ctx.matchers).length) return route.continue();
    const response = await route.fetch();
    const head = ruledHead(ctx, request, type, { status: response.status(), headers: response.headersArray() });
    await route.fulfill(head ? { response, status: head.status, headers: headersRecord(head.headers) } : { response });
  },
};

/**
 * Answers a request a browser driven through Playwright is about to send, as {@link decideRequest} decides (its body
 * known, so an override naming a GraphQL operation answers), with the response rules applied to what is sent on.
 */
export async function answerRoute(ctx: AnswerContext, route: Route): Promise<void> {
  const sent = route.request();
  const request: PausedRequest = { url: sent.url(), method: sent.method(), headers: await sent.allHeaders(), body: sent.postData() ?? undefined };
  const type = RESOURCE_TYPES[sent.resourceType()] ?? OTHER_RESOURCE;
  const decision = decideRequest(ctx, request, type);
  const carryOut = CARRY_OUT[decision.action] as (ctx: AnswerContext, route: Route, request: PausedRequest, type: string, decision: RequestDecision) => Promise<void>;
  await carryOut(ctx, route, request, type, decision);
}
