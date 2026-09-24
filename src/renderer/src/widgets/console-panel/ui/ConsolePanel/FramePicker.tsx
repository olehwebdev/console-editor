import type { ConsoleFrame } from '@common/types';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import { FrameChip, frameKey } from '@/entities/frame';
import { useConsoleTarget } from '../../model/useConsoleTarget';

export interface FramePickerProps {
  frames: readonly ConsoleFrame[];
  labels: ReadonlyMap<string, string>;
  targetKey: string;
  /** The picked frame, if it is on the page. */
  targetId: string | null;
  targetLabel: string;
}

const { setTarget } = useConsoleTarget.getState();

/** Picks the frame the prompt runs code in; frames with no JavaScript can't be picked. */
export function FramePicker({ frames, labels, targetKey, targetId, targetLabel }: FramePickerProps) {
  return (
    <Menu
      label="Run code in"
      side="top"
      items={frames.map((frame) => {
        const key = frameKey(frame);
        return { label: labels.get(frame.id) ?? key, checked: frame.id === targetId, disabled: !frame.canRun, onSelect: () => setTarget(key, frame.id) };
      })}
    >
      <button
        type="button"
        data-testid="console-frame-picker"
        aria-label={`Run code in ${targetLabel}`}
        className="mt-1 inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1 outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <FrameChip frameKey={targetKey} label={targetLabel} />
        <Icon icon={icons.ChevronDownIcon} size={12} className="text-fg-subtle" />
      </button>
    </Menu>
  );
}
