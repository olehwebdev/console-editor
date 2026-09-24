/** Longer messages are cut, ending with an ellipsis. */
const MAX_MESSAGE_LENGTH = 200;

/** An error's first line: electron-updater's run on with stack traces and response headers. */
export function errorMessage(err: unknown): string {
  const text = (err instanceof Error ? err.message : String(err)).split('\n')[0]!.trim();
  return text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : text;
}
