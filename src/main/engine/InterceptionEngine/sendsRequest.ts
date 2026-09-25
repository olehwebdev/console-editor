import type { Override } from '../../../shared/types';

/** Whether an override lets its request reach the server (answering its response), rather than answering before it is sent. */
export function sendsRequest(override: Override): boolean {
  return override.response?.send !== false;
}
