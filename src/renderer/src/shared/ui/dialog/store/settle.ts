import { confirmState } from './confirmState';
import { emit } from './emit';

/** Answers a request (no-op if it was already answered). */
export function settle(id: number, value: boolean): void {
  const request = confirmState.queue.find((r) => r.id === id);
  if (!request) return;
  confirmState.queue = confirmState.queue.filter((r) => r !== request);
  emit();
  request.resolve(value);
}
