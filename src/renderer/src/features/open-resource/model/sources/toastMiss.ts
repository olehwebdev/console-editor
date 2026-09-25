import type { MissReason } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { MISS_TEXT } from './missText';
import type { MissContext } from './types';

/** Says why a jump couldn't be made. */
export function toastMiss(miss: MissReason, context: MissContext): void {
  toast(MISS_TEXT[miss](context));
}
