import { MAX_ACTION_NAME } from '@common/constants';
import type { ConsoleAction } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** What a copy's name ends with. */
const COPY_SUFFIX = ' copy';

/** Adds a copy of an action after the others, to change into a variant of it. */
export async function duplicateAction({ name, target, targetName, code }: ConsoleAction): Promise<void> {
  try {
    await api.createAction({ name: `${name.slice(0, MAX_ACTION_NAME - COPY_SUFFIX.length)}${COPY_SUFFIX}`, target, targetName, code });
  } catch (err) {
    toast({ title: 'Could not copy the action', description: errorMessage(err), tone: 'danger' });
  }
}
