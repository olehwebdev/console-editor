import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { IconButton } from '@/shared/ui/icon-button';
import { FrameChip, frameKey, frameLabels, useFrameStore } from '@/entities/frame';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { chooseFrame, refreshTree } from '@/features/inspect/tree';
import { NO_NAMES } from '../InspectPanel/constants';
import { nameLevels } from './nameLevels';

/** The tree's title, which frame it shows (a chip per frame with components, to switch), and reading it again. */
export function TreeHeader({ frames: ids, frameId }: { frames: string[]; frameId: string | null }) {
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const labels = frameLabels(frames, names);
  const shown = ids.flatMap((id) => frames.filter((frame) => frame.id === id));
  return (
    <div className="flex min-h-7 flex-wrap items-center gap-1.5 px-1 pb-1">
      <span className="label-caps mr-auto">Components</span>
      {shown.map((frame) => (
        <button
          key={frame.id}
          type="button"
          onClick={() => void chooseFrame(frame.id).then(nameLevels)}
          className={cn('rounded-md', frame.id === frameId ? 'ring-1 ring-accent/60' : 'opacity-60 hover:opacity-100')}
          aria-pressed={frame.id === frameId}
          data-testid="tree-frame"
        >
          <FrameChip frameKey={frameKey(frame)} label={labels.get(frame.id) ?? frameKey(frame)} title={frame.url} />
        </button>
      ))}
      <IconButton icon={icons.ReloadIcon} label="Read the components again" size="sm" disabled={!frameId} onClick={() => void refreshTree().then(nameLevels)} data-testid="tree-refresh" />
    </div>
  );
}
