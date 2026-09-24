import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { openWhatsNew } from '../../model/update';
import { ITEM, ITEM_ICON_SIZE } from './constants';

/** Offered, or still on offer after a failure: opens What's New, where it downloads. */
export function offeredItem(version: string) {
  return (
    <button type="button" className={`${ITEM} text-accent`} onClick={openWhatsNew} data-testid="update-status">
      <Icon icon={icons.DownloadIcon} size={ITEM_ICON_SIZE} />
      Update to {version}
    </button>
  );
}
