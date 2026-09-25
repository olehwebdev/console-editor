import { Input } from '@/shared/ui/input';
import { STATUS_DIGITS } from './constants';
import { HeaderCount } from './HeaderCount';
import type { StageFieldsProps } from './types';

/** A response held before the page gets it: the status it answers with. */
export function ResponseFields({ held, draft, change }: StageFieldsProps) {
  const response = held.response;
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <span className="text-[12px] text-fg-subtle">Answer</span>
      <Input
        size="sm"
        mono
        inputMode="numeric"
        value={draft.status}
        aria-label="Status"
        title="Status"
        data-testid="held-status"
        className="w-14 shrink-0"
        onChange={(e) => STATUS_DIGITS.test(e.target.value) && change({ status: e.target.value })}
      />
      {response?.statusText ? <span className="shrink-0 text-[12px] text-fg-muted">{response.statusText}</span> : null}
      <HeaderCount headers={response?.headers ?? []} what="response" />
      {response && response.body === undefined ? (
        <span className="text-[12px] text-warning">Its body isn’t text: Send answers with what you type, Send original lets it through.</span>
      ) : null}
    </div>
  );
}
