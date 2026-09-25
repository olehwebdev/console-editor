import type { SourceMapKind } from '@common/types';
import { fileName } from '@/shared/lib';
import { toast } from '@/shared/ui/toast';
import type { SourceMapState } from '@/entities/source-map';
import { reloadSourceMap } from './reloadSourceMap';
import { STATE_TOASTS } from './stateToasts';

/** Says why a bundle's originals can't be shown (no map, or it failed, with a retry). Generic so each status reaches its own copy without a cast. */
export function toastSourceMapState<S extends SourceMapState['status']>(state: Extract<SourceMapState, { status: S }>, bundleUrl: string, kind: SourceMapKind): void {
  const options = STATE_TOASTS[state.status](state, fileName(bundleUrl), () => void reloadSourceMap(bundleUrl, kind));
  if (options) toast(options);
}
