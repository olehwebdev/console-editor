/** IPC errors arrive as "Error invoking remote method 'x': Error: message": this is everything before the message. */
const IPC_ERROR_PREFIX = /^Error invoking remote method '[^']+': (Error: )?/;

/** An error's message, without the prefix IPC adds. */
export function errorMessage(err: unknown): string {
  return String((err as Error)?.message ?? err).replace(IPC_ERROR_PREFIX, '');
}
