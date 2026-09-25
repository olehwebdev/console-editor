import type { ReactNode } from 'react';
import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { IconButton } from '@/shared/ui/icon-button';
import { useStoreLog } from '@/entities/inspector';
import { clearStores, recordStores } from '@/features/inspect/stores';

/** The Stores log's header: the pane's tabs, recording on or off, clearing, and closing the panel. */
export function StoresToolbar({ heading, onClose }: { heading: ReactNode; onClose(): void }) {
  const recording = useStoreLog((s) => s.recording);
  return (
    <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-line px-2">
      {/* The heading (the pane's tabs) scrolls sideways when the pane is narrow. */}
      <div className="flex h-full min-w-0 flex-auto items-center">{heading}</div>
      <Button size="sm" variant={recording ? 'secondary' : 'ghost'} onClick={() => void recordStores(!recording)} aria-pressed={recording} data-testid="stores-record">
        <span className={cn('size-2 rounded-full', recording ? 'animate-pulse bg-danger' : 'bg-fg-subtle')} />
        {recording ? 'Recording' : 'Record'}
      </Button>
      <IconButton icon={icons.DeleteIcon} label="Clear the store actions" size="sm" onClick={clearStores} data-testid="stores-clear" />
      <IconButton icon={icons.CloseIcon} label="Close the panel" size="sm" shortcut={SHORTCUT.console} onClick={onClose} />
    </div>
  );
}
