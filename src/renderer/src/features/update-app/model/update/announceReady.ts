import type { AvailableUpdate } from '@common/types';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { DMG_EXTENSION, UPDATE_TOAST_ID } from './constants';
import { installUpdate } from './installUpdate';
import { manualInstallHint } from './manualInstallHint';

export function announceReady(update: AvailableUpdate, file: string | undefined): void {
  if (update.install === 'auto') {
    toast({
      id: UPDATE_TOAST_ID,
      title: `Console Editor ${update.version} is ready to install`,
      description: update.installsOnQuit
        ? 'Restart to finish, or quit. Unsaved edits are kept as drafts.'
        : 'Restart to install it (it asks for your password). Unsaved edits are kept as drafts.',
      tone: 'success',
      action: { label: 'Restart now', onClick: installUpdate },
      duration: TOAST_DURATION.pending,
    });
  } else {
    toast({
      id: UPDATE_TOAST_ID,
      title: `Console Editor ${update.version} downloaded`,
      description: manualInstallHint(file),
      tone: 'success',
      action: { label: file?.endsWith(DMG_EXTENSION) ? 'Open again' : 'Show file', onClick: installUpdate },
      duration: TOAST_DURATION.pending,
    });
  }
}
