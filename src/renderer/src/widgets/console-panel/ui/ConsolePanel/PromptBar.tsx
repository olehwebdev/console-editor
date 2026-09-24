import type { ConsoleFrame } from '@common/types';
import { frameKey } from '@/entities/frame';
import { ConsolePrompt } from '@/features/run-in-frame';
import { useConsoleTarget } from '../../model/useConsoleTarget';
import { FramePicker } from './FramePicker';
import { NameFrameButton } from './NameFrameButton';
import { promptPlaceholder } from './promptPlaceholder';

export interface PromptBarProps {
  frames: readonly ConsoleFrame[];
  labels: ReadonlyMap<string, string>;
  names: Readonly<Record<string, string>>;
  /** The label of a frame that isn't on the page, from the rows it left. */
  labelOfKey(key: string): string;
}

/** The frame code runs in, its name, and the prompt. */
export function PromptBar({ frames, labels, names, labelOfKey }: PromptBarProps) {
  const targetKey = useConsoleTarget((s) => s.targetKey);
  const target = frames.find((f) => frameKey(f) === targetKey) ?? null;
  const label = target ? (labels.get(target.id) ?? targetKey) : labelOfKey(targetKey);
  return (
    <div className="flex shrink-0 items-start gap-1.5 border-t border-line px-2">
      <FramePicker frames={frames} labels={labels} targetLabel={label} />
      <NameFrameButton frame={target} names={names} />
      <ConsolePrompt frameId={target?.canRun ? target.id : null} placeholder={promptPlaceholder(target, label)} />
    </div>
  );
}
