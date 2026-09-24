import type { ConsoleEntry } from '@common/types';
import { errorMessage } from '@/shared/api';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { rowLine } from './rowLine';
import type { ResolveFrame } from './types';

/** Copies the rows as text, one per line, for a bug report or a chat. */
export async function copyRows(entries: readonly ConsoleEntry[], resolve: ResolveFrame): Promise<void> {
  try {
    await navigator.clipboard.writeText(entries.map((e) => rowLine(e, resolve)).join('\n'));
    toast({ title: `Copied ${entries.length} ${entries.length === 1 ? 'row' : 'rows'}`, tone: 'success', duration: TOAST_DURATION.confirm });
  } catch (err) {
    toast({ title: 'Could not copy the rows', description: errorMessage(err), tone: 'danger' });
  }
}
