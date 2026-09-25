import type { ToastOptions } from '@/shared/ui/toast';
import { describeFailure, type SourceMapState } from '@/entities/source-map';

/**
 * What a toast says about a bundle's map state, if anything: only a missing or failed map needs
 * explaining. A new status fails typecheck until it's decided here.
 */
export const STATE_TOASTS: {
  [S in SourceMapState['status']]: (state: Extract<SourceMapState, { status: S }>, bundle: string, retry: () => void) => ToastOptions | null;
} = {
  loading: () => null,
  ready: () => null,
  none: (_state, bundle) => ({
    title: `${bundle} has no source map`,
    description: 'Neither a SourceMap header nor a sourceMappingURL comment names one.',
    tone: 'neutral',
  }),
  failed: ({ failure, detail }, bundle, retry) => ({
    title: `Couldn't read the source map of ${bundle}`,
    description: describeFailure(failure, detail, bundle),
    tone: 'danger',
    action: { label: 'Retry', onClick: retry },
  }),
};
