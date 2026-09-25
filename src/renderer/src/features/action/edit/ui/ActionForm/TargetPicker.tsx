import type { ConsoleFrame } from '@common/types';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import { FrameChip, frameKey, frameLabels, locateTarget } from '@/entities/frame';

export interface TargetPickerProps {
  frames: readonly ConsoleFrame[];
  names: Readonly<Record<string, string>>;
  /** The picked frame's key and `name` attribute. */
  target: string;
  targetName: string;
  onPick(frame: ConsoleFrame): void;
}

/** Picks the frame an action runs in from the page's frames; the one picked shows even while it isn't on the page. */
export function TargetPicker({ frames, names, target, targetName, onPick }: TargetPickerProps) {
  const { frame: current, label } = locateTarget(frames, names, target, targetName);
  const labels = frameLabels(frames, names);
  return (
    <Menu
      label="Run in"
      disabled={!frames.length}
      items={frames.map((frame) => ({
        label: labels.get(frame.id) ?? frameKey(frame),
        checked: frame.id === current?.id,
        disabled: !frame.canRun,
        onSelect: () => onPick(frame),
      }))}
    >
      <button
        type="button"
        data-testid="action-target"
        aria-label={`Runs in ${label}`}
        title={current ? undefined : "This frame isn't on the page"}
        className="inline-flex h-6 min-w-0 items-center gap-1 rounded-md px-1 outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default"
      >
        <FrameChip frameKey={target} label={label} gone={!current} />
        <Icon icon={icons.ChevronDownIcon} size={12} className="shrink-0 text-fg-subtle" />
      </button>
    </Menu>
  );
}
