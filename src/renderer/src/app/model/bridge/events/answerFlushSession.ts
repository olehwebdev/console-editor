import { api } from '@/shared/api';
import { flushSession } from '../../session';

/** The window is closing: writes pending drafts, then tells the main process whether all were kept. */
export function answerFlushSession(): void {
  void flushSession().then(api.sessionFlushed, () => api.sessionFlushed(false));
}
