import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { Spinner } from '@/shared/ui/spinner';
import { useUpdateStore } from '@/entities/app-update';
import { installUpdate, openWhatsNew } from '../model/update';

const ITEM = 'flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors hover:bg-hover hover:text-fg';

/** Status-bar entry while an update is on offer: available, downloading, ready to install. */
export function UpdateStatus() {
  const state = useUpdateStore((s) => s.state);

  if (state.status === 'available' || (state.status === 'error' && state.update)) {
    return (
      <button type="button" className={`${ITEM} text-accent`} onClick={openWhatsNew} data-testid="update-status">
        <Icon icon={icons.DownloadIcon} size={12} />
        Update to {state.update!.version}
      </button>
    );
  }
  if (state.status === 'downloading') {
    return (
      <button type="button" className={ITEM} onClick={openWhatsNew} data-testid="update-status">
        <Spinner size={11} className="text-accent" />
        Downloading update… {state.percent}%
      </button>
    );
  }
  if (state.status === 'ready') {
    return (
      <button type="button" className={`${ITEM} text-accent`} onClick={installUpdate} data-testid="update-status">
        <Icon icon={state.update.install === 'auto' ? icons.ReloadIcon : icons.DownloadIcon} size={12} />
        {state.update.install === 'auto' ? 'Restart to update' : `${state.update.version} downloaded`}
      </button>
    );
  }
  return null;
}
