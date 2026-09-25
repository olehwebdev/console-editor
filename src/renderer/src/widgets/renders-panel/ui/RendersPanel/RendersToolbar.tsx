import type { ReactNode } from 'react';
import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui/button';
import { IconButton } from '@/shared/ui/icon-button';
import { useRenderLog } from '@/entities/inspector';
import { clearRenders, recordRenders } from '@/features/inspect/renders';

/** The Renders log's header: the panel's tabs, recording on or off, clearing, and closing the panel. */
export function RendersToolbar({ title, onClose }: { title: ReactNode; onClose(): void }) {
  const recording = useRenderLog((s) => s.recording);
  return (
    <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-line px-2">
      <div className="min-w-0 flex-1">{title}</div>
      <Button size="sm" variant={recording ? 'secondary' : 'ghost'} onClick={() => void recordRenders(!recording)} aria-pressed={recording} data-testid="renders-record">
        <span className={cn('size-2 rounded-full', recording ? 'animate-pulse bg-danger' : 'bg-fg-subtle')} />
        {recording ? 'Recording' : 'Record'}
      </Button>
      <IconButton icon={icons.DeleteIcon} label="Clear the renders" size="sm" onClick={clearRenders} data-testid="renders-clear" />
      <IconButton icon={icons.CloseIcon} label="Close the panel" size="sm" shortcut={SHORTCUT.console} onClick={onClose} />
    </div>
  );
}
