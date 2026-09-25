/** Text that isn't JSON: the message says what was expected, `offset` where. */
export class JsonSyntaxError extends Error {
  constructor(
    message: string,
    readonly offset: number,
  ) {
    super(`${message} at offset ${offset}`);
    this.name = 'JsonSyntaxError';
  }
}
