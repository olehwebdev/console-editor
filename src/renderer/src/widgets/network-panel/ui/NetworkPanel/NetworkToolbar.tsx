import type { ReactNode } from 'react';
import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { clearNetworkLog } from '@/features/network/clear';
import { useNetworkFilter } from '@/features/network/filter';
import { GroupChips } from './GroupChips';

export interface NetworkToolbarProps {
  /** What names the panel on the left: the bottom pane's tabs. */
  heading: ReactNode;
  onClose(): void;
}

// Actions never change, so they are read once instead of subscribed to.
const { setText, toggleKeepRows } = useNetworkFilter.getState();

/** The Network panel's header: its heading, the text filter and actions, then the type chips. */
export function NetworkToolbar({ heading, onClose }: NetworkToolbarProps) {
  const text = useNetworkFilter((s) => s.text);
  const keepRows = useNetworkFilter((s) => s.keepRows);
  return (
    <div className="flex shrink-0 flex-col border-b border-line">
      <div className="flex h-9 items-center gap-1.5 px-2">
        {/* The heading (the pane's tabs) keeps its width; the filter gives way. */}
        <div className="flex h-full flex-auto items-center">{heading}</div>
        <Input
          size="sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Filter"
          aria-label="Filter requests"
          data-testid="network-filter"
          leading={<Icon icon={icons.FilterIcon} size={12} className="text-fg-subtle" />}
          className="w-40 min-w-20 shrink"
        />
        <IconButton icon={icons.PinIcon} label="Keep rows when the page loads another page" size="sm" active={keepRows} aria-pressed={keepRows} onClick={toggleKeepRows} />
        <IconButton icon={icons.DeleteIcon} label="Clear the list" size="sm" data-testid="network-clear" onClick={clearNetworkLog} />
        <IconButton icon={icons.CloseIcon} label="Close the panel" size="sm" shortcut={SHORTCUT.console} onClick={onClose} />
      </div>
      <GroupChips />
    </div>
  );
}
