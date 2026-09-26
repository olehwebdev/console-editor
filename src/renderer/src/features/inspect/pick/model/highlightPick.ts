import { api } from '@/shared/api';

/** Highlights a picked element in the page while the pointer is on its component; null hides it. */
export function highlightPick(pickId: string | null): void {
  api.highlightPick(pickId).catch(() => undefined);
}
