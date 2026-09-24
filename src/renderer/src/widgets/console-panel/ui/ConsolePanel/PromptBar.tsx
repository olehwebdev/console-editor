import type { ConsoleFrame } from '@common/types';
import { useWorkspaceStore } from '@/entities/workspace';
import { ConsolePrompt } from '@/features/run-in-frame';
import { useConsoleTarget } from '../../model/useConsoleTarget';
import { FramePicker } from './FramePicker';
import { NameFrameButton } from './NameFrameButton';
import { promptPlaceholder } from './promptPlaceholder';
import { resolveTarget } from './resolveTarget';

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
  const targetId = useConsoleTarget((s) => s.targetId);
  const workspaceId = useWorkspaceStore((s) => s.activeId);
  const target = resolveTarget(frames, targetKey, targetId);
  const label = target ? (labels.get(target.id) ?? targetKey) : labelOfKey(targetKey);
  return (
    <div className="flex shrink-0 items-start gap-1.5 border-t border-line px-2">
      <FramePicker frames={frames} labels={labels} targetKey={targetKey} targetId={target?.id ?? null} targetLabel={label} />
      <NameFrameButton frame={target} names={names} />
      {/* Keyed: its history walk belongs to the workspace it started in. */}
      <ConsolePrompt key={workspaceId} frameId={target?.canRun ? target.id : null} placeholder={promptPlaceholder(target, label)} />
    </div>
  );
}
