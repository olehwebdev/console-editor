/** What such errors say: Chromium's messages, and those of our own transports and iframe sessions. */
const BENIGN_CDP_ERROR =
  /session .* is gone|Session with given id not found|No session with given id|session detached|target closed|Invalid InterceptionId|Inspected target navigated or closed/i;

/** Errors that only mean the request's frame or session is gone (navigated away, removed, detached). */
export function isBenignCdpError(err: unknown): boolean {
  return BENIGN_CDP_ERROR.test(String((err as Error)?.message ?? err));
}
