import { dismiss } from './dismiss';
import { show } from './show';
import type { ToastFn } from './types';
import { update } from './update';

/** Imperative API: `toast({ title: 'Saved', tone: 'success' })`, `toast.dismiss(id)`. Needs one `<ToastStack/>` mounted. */
export const toast: ToastFn = Object.assign(show, { dismiss, update });
