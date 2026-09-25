/** What a response override's request match reads from a paused request. */
export interface MatchedRequest {
  method: string;
  /** The GraphQL operation its body names, read (once) only when an override asks. */
  operation(): string | undefined;
}
