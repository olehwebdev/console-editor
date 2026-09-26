import type { ReactNode } from 'react';
import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { RecordButton } from './RecordButton';

interface RecordingToolbarProps {
  /** The pane's tabs. */
  heading: ReactNode;
  recording: boolean;
  onRecord(on: boolean): void;
  /** Names what Clear empties (the renders, the store actions). */
  clearLabel: string;
  onClear(): void;
  onClose(): void;
  /** Its buttons' test ids: this, then `-record` and `-clear`. */
  testIdPrefix: string;
}

/** A log's header in the bottom pane (the Renders', the Stores'): the pane's tabs, recording on or off, clearing, and closing the panel. */
export function RecordingToolbar({ heading, recording, onRecord, clearLabel, onClear, onClose, testIdPrefix }: RecordingToolbarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-line px-2">
      {/* The heading (the pane's tabs) scrolls sideways when the pane is narrow. */}
      <div className="flex h-full min-w-0 flex-auto items-center">{heading}</div>
      <RecordButton recording={recording} onToggle={() => onRecord(!recording)} testId={`${testIdPrefix}-record`} />
      <IconButton icon={icons.DeleteIcon} label={clearLabel} size="sm" onClick={onClear} data-testid={`${testIdPrefix}-clear`} />
      <IconButton icon={icons.CloseIcon} label="Close the panel" size="sm" shortcut={SHORTCUT.console} onClick={onClose} />
    </div>
  );
}
