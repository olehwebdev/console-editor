import { FrameChip, frameKey, frameLabels, useFrameStore } from '@/entities/frame';
import { selectActiveWorkspace, useWorkspaceStore } from '@/entities/workspace';

/** A workspace with no frame names yet: one shared object, so selecting it never re-renders. */
const NO_NAMES: Readonly<Record<string, string>> = {};

/** The chip of the frame a picked element is in, labelled as in the console; nothing while the console doesn't list it. */
export function ComponentFrame({ frameId }: { frameId: string | null }) {
  const frames = useFrameStore((s) => s.frames);
  const names = useWorkspaceStore((s) => selectActiveWorkspace(s)?.frameNames ?? NO_NAMES);
  const frame = frames.find((f) => f.id === frameId);
  if (!frame) return null;
  return <FrameChip frameKey={frameKey(frame)} label={frameLabels(frames, names).get(frame.id) ?? frameKey(frame)} title={frame.url} />;
}
