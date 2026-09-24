import type { AvailableUpdate } from '@common/types';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { installUpdate, manualInstallHint } from '../../model/update';
import { DMG_EXTENSION } from '../../model/update/constants';
import { CARD_ICON_SIZE } from './constants';

/** Downloaded: restart into it (auto), or open the file again (manual). */
export function readyStep(update: AvailableUpdate, file: string | undefined) {
  return update.install === 'auto' ? (
    <>
      <span className="flex-1 text-[12.5px] text-fg-muted">
        Downloaded.{update.installsOnQuit ? '' : ' Restarting asks for your password.'} Unsaved edits are kept as drafts across the restart.
      </span>
      <Button variant="primary" size="sm" leading={<Icon icon={icons.ReloadIcon} size={CARD_ICON_SIZE} />} onClick={installUpdate}>
        Restart to update
      </Button>
    </>
  ) : (
    <>
      <span className="flex-1 text-[12.5px] text-fg-muted">{manualInstallHint(file)}</span>
      <Button size="sm" onClick={installUpdate}>
        {file?.endsWith(DMG_EXTENSION) ? 'Open again' : 'Show file'}
      </Button>
    </>
  );
}
