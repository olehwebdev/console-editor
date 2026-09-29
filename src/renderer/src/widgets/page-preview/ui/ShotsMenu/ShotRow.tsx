import type { Shot } from '@common/types';
import { api } from '@/shared/api';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { ContextMenu, type MenuItem } from '@/shared/ui/menu';
import { shotDetail, ShotThumb } from '@/entities/shot';
import { copyShot, deleteShot, saveShotAs } from '@/features/shot/manage';
import { showOverlay } from '@/features/shot/overlay';
import { ROW_THUMB } from './constants';

export interface ShotRowProps {
  shot: Shot;
  now: number;
  /** Deleting is offered (where confirming it can be asked: the editor). */
  canDelete: boolean;
  onOpen(shot: Shot): void;
}

/** A shot in the menu: its thumbnail, name and where it came from; choosing it opens its page, right-click offers the rest. */
export function ShotRow({ shot, now, canDelete, onOpen }: ShotRowProps) {
  const items: MenuItem[] = [
    { label: 'Open', icon: icons.ShotIcon, onSelect: () => onOpen(shot) },
    { label: 'Put over the page', icon: icons.OverlayIcon, onSelect: () => void showOverlay(shot) },
    { label: 'Copy image', icon: icons.CopyIcon, onSelect: () => void copyShot(shot) },
    { label: 'Save a copy…', icon: icons.DownloadIcon, onSelect: () => void saveShotAs(shot) },
    { label: 'Show in folder', icon: icons.FolderOpenIcon, onSelect: () => void api.showShotFile(shot.id) },
    ...(canDelete ? [{ separator: true } as const, { label: 'Delete', icon: icons.DeleteIcon, danger: true, onSelect: () => void deleteShot(shot) }] : []),
  ];
  return (
    <ContextMenu items={items} label={shot.name}>
      <button
        type="button"
        onClick={() => onOpen(shot)}
        data-testid="shot-row"
        data-shot-id={shot.id}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none transition-colors duration-150 hover:bg-hover focus-visible:bg-hover"
      >
        <ShotThumb shot={shot} size={ROW_THUMB} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-fg">{shot.name}</span>
          <span className="block truncate text-[12px] text-fg-subtle">{shotDetail(shot, now)}</span>
        </span>
        <Icon icon={icons.ChevronRightIcon} size={14} className="text-fg-subtle" />
      </button>
    </ContextMenu>
  );
}
