import { STATUS_CODES } from 'node:http';
import type { ResponseHead } from '../rules';
import { bidiHeaders } from './bidiHeaders';
import { BIDI } from './constants';
import type { BidiConnection } from './BidiConnection';

/** Answers a request paused before it was sent, with `head` and `body`: it never reaches the server. */
export async function provideResponse(connection: BidiConnection, request: string, head: ResponseHead, body: string): Promise<void> {
  await connection.send(BIDI.network.provideResponse, {
    request,
    statusCode: head.status,
    reasonPhrase: STATUS_CODES[head.status] ?? '',
    headers: bidiHeaders(head.headers),
    body: { type: 'string', value: body },
  });
}
