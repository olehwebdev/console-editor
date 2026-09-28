import type { Shot } from '@common/types';
import { api } from '@/shared/api';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { copyShot, deleteShot, saveShotAs } from '@/features/shot/manage';
import { showOverlay } from '@/features/shot/overlay';

/** What can be done with a shot from its page: lay it over the page, copy it, save a copy, show its file, delete it. */
export function ShotActions({ shot }: { shot: Shot }) {
  return (
    <div className="flex items-center gap-0.5">
      <IconButton icon={icons.OverlayIcon} label="Put over the page" size="sm" onClick={() => void showOverlay(shot)} data-testid="shot-overlay" />
      <IconButton icon={icons.CopyIcon} label="Copy image" size="sm" onClick={() => void copyShot(shot)} />
      <IconButton icon={icons.DownloadIcon} label="Save a copy…" size="sm" onClick={() => void saveShotAs(shot)} />
      <IconButton icon={icons.FolderOpenIcon} label="Show in folder" size="sm" onClick={() => void api.showShotFile(shot.id)} />
      <IconButton icon={icons.DeleteIcon} label="Delete" size="sm" danger onClick={() => void deleteShot(shot)} data-testid="shot-delete" />
    </div>
  );
}
