import { toast } from '@/shared/ui/toast';
import type { AppEventOf } from '../types';

/** Something failed in the main process (the engine, a page load). */
export function showAppError(event: AppEventOf<'error'>): void {
  toast({ title: 'Something went wrong', description: event.message, tone: 'danger' });
}
