import type { ConsoleEntry } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { useFrameStore } from '@/entities/frame';
import type { SaveAsAction } from './types';

/** On a row of code you ran: keeps that code as an action for the frame it ran in (shown while the row is hovered). */
export function SaveActionButton({ entry, onSave }: { entry: ConsoleEntry; onSave: SaveAsAction }) {
  return (
    <IconButton
      icon={icons.SaveActionIcon}
      label="Save as action"
      size="sm"
      data-testid="console-save-action"
      className="-my-[3px] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      onClick={() => onSave(entry.values[0]?.text ?? '', entry.frameId === null ? undefined : useFrameStore.getState().seen[entry.frameId])}
    />
  );
}
