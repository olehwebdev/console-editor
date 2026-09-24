import { api } from '@/shared/api';
import { pageSession } from '../pageSession';

/** The window is closing: writes pending drafts, then tells the main process whether all were kept. */
export function answerFlushSession(): void {
  void (pageSession.current?.flush() ?? Promise.resolve(true)).then(api.sessionFlushed, () => api.sessionFlushed(false));
}
