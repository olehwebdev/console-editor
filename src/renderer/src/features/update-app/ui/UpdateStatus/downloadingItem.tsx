import { Spinner } from '@/shared/ui/spinner';
import { openWhatsNew } from '../../model/update';
import { ITEM } from './constants';

/** Downloading: opens What's New, which shows the progress. */
export function downloadingItem(percent: number) {
  return (
    <button type="button" className={ITEM} onClick={openWhatsNew} data-testid="update-status">
      <Spinner size={11} className="text-accent" />
      Downloading update… {percent}%
    </button>
  );
}
