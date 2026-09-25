import type { SourceMapKind } from '@common/types';
import { TOAST_DURATION } from '@/shared/config';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import { useSourceMapStore } from '@/entities/source-map';
import { reloadSourceMap } from './reloadSourceMap';

/** Warns, once per map, when its positions run past its bundle (jumps stay possible: the check can be wrong). */
export function noteMismatch(bundleUrl: string, kind: SourceMapKind, mismatch: boolean): void {
  const state = useSourceMapStore.getState().byBundle[bundleUrl];
  if (!mismatch || state?.status !== 'ready' || state.mismatch) return;
  useSourceMapStore.getState().markMismatch(bundleUrl);
  toast({
    title: `This source map may not match ${fileName(bundleUrl)}`,
    description: 'Some of its positions fall outside the file (a different build?). Jumps may land on the wrong line.',
    tone: 'warning',
    duration: TOAST_DURATION.actionable,
    action: { label: 'Reload source map', onClick: () => void reloadSourceMap(bundleUrl, kind) },
  });
}
