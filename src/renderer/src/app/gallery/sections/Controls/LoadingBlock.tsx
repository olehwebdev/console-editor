import { Shimmer, Skeleton, Spinner } from '@/shared/ui/spinner';
import { Block } from '../../Block';
import { Row } from './Row';

/** Spinner sizes shown around its 14 px default. */
const SPINNER_SIZE = { sm: 12, lg: 16, xl: 20 } as const;
/** Bars in the paragraph skeleton. */
const SKELETON_LINES = 3;

export function LoadingBlock() {
  return (
    <Block title="Spinner · Skeleton · Shimmer" hint="loading states">
      <Row label="spinner">
        <Spinner size={SPINNER_SIZE.sm} />
        <Spinner />
        <Spinner size={SPINNER_SIZE.lg} className="text-accent" />
        <Spinner size={SPINNER_SIZE.xl} className="text-live" label="Loading resources" />
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <Spinner size={SPINNER_SIZE.sm} /> Connecting to page…
        </span>
      </Row>
      <Row label="shimmer">
        <Shimmer className="text-[13px]">Pretty-printing…</Shimmer>
      </Row>
      <div className="flex max-w-md flex-col gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton lines={SKELETON_LINES} />
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </Block>
  );
}
