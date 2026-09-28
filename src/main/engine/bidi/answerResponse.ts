import { STATUS_CODES } from 'node:http';
import { ruledHead } from '../answering';
import { bidiHeaders } from './bidiHeaders';
import { BIDI } from './constants';
import { headerEntriesOf } from './headerEntriesOf';
import { requestOf } from './requestOf';
import { resourceTypeOf } from './resourceTypeOf';
import type { BidiAnswerContext, BidiNetworkEvent } from './types';

/** Lets a response paused at its head go on, with the response rules that take it applied to its status and headers. */
export async function answerResponse(ctx: BidiAnswerContext, { request: data, response }: BidiNetworkEvent): Promise<void> {
  const head = response ? ruledHead(ctx, requestOf(data), resourceTypeOf(data), { status: response.status, headers: headerEntriesOf(response.headers) }) : null;
  const changed = head ? { statusCode: head.status, reasonPhrase: STATUS_CODES[head.status] ?? '', headers: bidiHeaders(head.headers) } : {};
  await ctx.connection.send(BIDI.network.continueResponse, { request: data.request, ...changed });
}
