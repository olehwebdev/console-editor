import type { AvailableUpdate } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import type { UpdateStateOf } from '@/entities/app-update';
import { availableHint, downloadLabel, downloadUpdate } from '../../model/update';
import { CARD_ICON_SIZE } from './constants';

/** Before a download, or after one failed: how it installs (or what went wrong), and the button that starts it. */
export function downloadStep(update: AvailableUpdate, error?: UpdateStateOf<'error'>) {
  // After a failed download or install, the same button tries again; a failed check changes nothing here.
  const retry = !!error && error.during !== 'check';
  return (
    <>
      <span className={cn('flex-1 text-[12.5px]', error ? 'text-danger' : 'text-fg-muted')} role={error ? 'alert' : undefined}>
        {error
          ? error.message
          : update.install === 'auto'
            ? availableHint(update)
            : 'The download is checked against the release’s SHA-256 checksums.'}
      </span>
      <Button variant="primary" size="sm" leading={<Icon icon={icons.DownloadIcon} size={CARD_ICON_SIZE} />} onClick={downloadUpdate}>
        {retry ? 'Try again' : downloadLabel(update)}
      </Button>
    </>
  );
}
