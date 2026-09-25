import type { SourceMapKind } from '@common/types';
import { TOAST_DURATION } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { useSourceMapStore, type SourceMapState } from '@/entities/source-map';
import { ensureSourceMap } from './ensureSourceMap';
import { toastSourceMapState } from './toastSourceMapState';

/** A bundle's map, ready for a jump: loaded if needed (saying so while it downloads), or null after saying why not. */
export async function readySourceMap(bundleUrl: string, kind: SourceMapKind): Promise<Extract<SourceMapState, { status: 'ready' }> | null> {
  const held = useSourceMapStore.getState().byBundle[bundleUrl]?.status === 'ready';
  const pending = held ? null : toast({ title: `Reading the source map of ${fileName(bundleUrl)}…`, tone: 'neutral', duration: TOAST_DURATION.pending });
  const state = await ensureSourceMap(bundleUrl, kind);
  if (pending) toast.dismiss(pending);
  if (state.status === 'ready') return state;
  toastSourceMapState(state, bundleUrl, kind);
  return null;
}
