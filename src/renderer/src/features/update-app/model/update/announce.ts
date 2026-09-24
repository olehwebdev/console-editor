import type { AvailableUpdate } from '@common/types';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { announcement } from './announcement';
import { availableHint } from './availableHint';
import { UPDATE_TOAST_ID } from './constants';
import { downloadLabel } from './downloadLabel';
import { downloadUpdate } from './downloadUpdate';
import { openWhatsNew } from './openWhatsNew';

export function announce(update: AvailableUpdate): void {
  announcement.version = update.version;
  toast({
    id: UPDATE_TOAST_ID,
    title: `Console Editor ${update.version} is available`,
    description: availableHint(update),
    action: { label: downloadLabel(update), onClick: downloadUpdate },
    secondaryAction: { label: "What's new", onClick: openWhatsNew },
    duration: TOAST_DURATION.pending,
  });
}
