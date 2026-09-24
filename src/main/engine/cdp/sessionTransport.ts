import type { CdpTransport } from './types';

/**
 * A view of `transport` bound to one session: commands go to `sessionId`
 * (undefined = the page's own session) and only that session's events are
 * delivered. Engines are always given one of these, so a request paused on
 * one session can never be continued on another.
 */
export function sessionTransport(transport: CdpTransport, sessionId?: string): CdpTransport {
  // '' and undefined both mean the page's own session.
  const own = sessionId || undefined;
  return {
    send: (method, params) => transport.send(method, params, own),
    on: (event, handler) =>
      transport.on(event, (params, sid) => {
        if ((sid || undefined) === own) handler(params);
      }),
  };
}
