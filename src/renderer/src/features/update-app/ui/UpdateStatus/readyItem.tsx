import type { AvailableUpdate } from '@common/types';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { installUpdate } from '../../model/update';
import { ITEM, ITEM_ICON_SIZE } from './constants';

/** Downloaded: restarts into it (auto), or shows the file (manual). */
export function readyItem(update: AvailableUpdate) {
  return (
    <button type="button" className={`${ITEM} text-accent`} onClick={installUpdate} data-testid="update-status">
      <Icon icon={update.install === 'auto' ? icons.ReloadIcon : icons.DownloadIcon} size={ITEM_ICON_SIZE} />
      {update.install === 'auto' ? 'Restart to update' : `${update.version} downloaded`}
    </button>
  );
}
