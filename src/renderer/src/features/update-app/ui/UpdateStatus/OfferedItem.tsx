import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { openWhatsNew } from '../../model/update';
import { ITEM, ITEM_ICON_SIZE } from './constants';

export function OfferedItem({ version }: { version: string }) {
  return (
    <button type="button" className={`${ITEM} text-accent`} onClick={openWhatsNew} data-testid="update-status">
      <Icon icon={icons.DownloadIcon} size={ITEM_ICON_SIZE} />
      Update to {version}
    </button>
  );
}
