import type { NetworkRequest } from '@common/types';
import { STATUS_CLASS_TONE } from './constants';

/** A row's status and its tint: red when it failed, … until a response arrives (which has its status before its body). */
export function statusCell({ state, status }: Pick<NetworkRequest, 'state' | 'status'>): { text: string; className: string } {
  if (state === 'failed') return { text: status ? String(status) : 'failed', className: 'text-danger' };
  if (!status) return { text: '…', className: 'text-fg-subtle' };
  return { text: String(status), className: STATUS_CLASS_TONE[Math.floor(status / 100)] ?? 'text-fg-muted' };
}
