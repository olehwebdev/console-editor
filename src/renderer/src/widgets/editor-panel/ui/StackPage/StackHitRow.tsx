import { STACK_LIBRARIES } from '@common/stackLibraries';
import type { StackHit } from '@common/types';
import { Badge } from '@/shared/ui/badge';
import { BUILD_TONE, CATEGORY_LABEL } from './constants';

/** One finding: what kind it is, the library with its version and build, and under it how the frame showed it. */
export function StackHitRow({ hit }: { hit: StackHit }) {
  const library = STACK_LIBRARIES[hit.id];
  const evidence: Record<string, string> = library.signals;
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-3 px-3.5 py-1.5" data-testid="stack-hit" data-library={hit.id}>
      <span className="text-fg-subtle">{CATEGORY_LABEL[library.category]}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-fg">
            {library.name}
            {hit.version ? <span className="text-fg-muted"> {hit.version}</span> : null}
          </span>
          {hit.build ? <Badge tone={BUILD_TONE[hit.build]}>{hit.build}</Badge> : null}
        </span>
        <span className="text-[12px] text-fg-muted">{evidence[hit.signal]}</span>
      </span>
    </div>
  );
}
