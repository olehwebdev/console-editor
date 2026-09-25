import { Input } from '@/shared/ui/input';
import { HeaderCount } from './HeaderCount';
import type { StageFieldsProps } from './types';

/** A request held before it is sent: the method and URL it goes out with. */
export function RequestFields({ held, draft, change }: StageFieldsProps) {
  return (
    <div className="flex min-w-0 flex-[1_1_360px] flex-wrap items-center gap-2">
      <span className="text-[12px] text-fg-subtle">Request</span>
      <Input
        size="sm"
        mono
        value={draft.method}
        aria-label="Method"
        data-testid="held-method"
        className="w-20 shrink-0"
        onChange={(e) => change({ method: e.target.value })}
      />
      <Input size="sm" mono value={draft.url} aria-label="URL" data-testid="held-url" className="min-w-[200px] flex-1" onChange={(e) => change({ url: e.target.value })} />
      <HeaderCount headers={held.requestHeaders} what="request" />
    </div>
  );
}
