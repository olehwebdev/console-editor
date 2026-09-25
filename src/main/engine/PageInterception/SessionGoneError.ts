/** What a child session's in-flight commands are rejected with once it is removed. */
export class SessionGoneError extends Error {
  constructor(sessionId: string) {
    super(`session ${sessionId} is gone`);
  }
}
