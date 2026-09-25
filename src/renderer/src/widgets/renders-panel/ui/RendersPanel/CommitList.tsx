import type { RenderCommit } from '@common/types';
import { frameLabels, useFrameStore } from '@/entities/frame';
import { useRenderLog } from '@/entities/inspector';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';
import { CommitRow } from './CommitRow';
import { MAX_SHOWN, NO_NAMES } from './constants';

/** The commits recorded, the newest first (the last `MAX_SHOWN`), each with its frame; or what recording shows. */
export function CommitList({ commits }: { commits: readonly RenderCommit[] }) {
  const recording = useRenderLog((s) => s.recording);
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const labels = frameLabels(frames, names);
  const shown = commits.slice(-MAX_SHOWN).reverse();
  if (!shown.length) {
    return (
      <p className="px-3 py-2 text-[12px] text-fg-subtle">
        {recording
          ? 'Recording. Use the page: each React commit shows here, with why each component rendered.'
          : 'Record to see each React commit in the page and its frames: what triggered it, and why each component rendered.'}
      </p>
    );
  }
  return shown.map((commit) => (
    <CommitRow key={commit.id} commit={commit} frame={frames.find((f) => f.id === commit.frameId)} label={commit.frameId ? labels.get(commit.frameId) : undefined} />
  ));
}
