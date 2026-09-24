import { TOAST_DURATION } from '@/shared/config';
import type { ToastTone } from './types';

export function defaultDuration(tone: ToastTone) {
  return tone === 'danger' ? TOAST_DURATION.danger : TOAST_DURATION.normal;
}
