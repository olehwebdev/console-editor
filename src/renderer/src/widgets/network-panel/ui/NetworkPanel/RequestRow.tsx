import type { NetworkRequest } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { FrameChip } from '@/entities/frame';
import { requestPath } from '@/entities/network-request';
import { WORKER_NAME } from '@/entities/resource';
import { formatDuration } from './formatDuration';
import { formatSize } from './formatSize';
import { statusCell } from './statusCell';
import type { FrameInfo } from './types';

export interface RequestRowProps {
  request: NetworkRequest;
  frame: FrameInfo | null;
  selected: boolean;
  /** The details are open beside the list: no type, size or time. */
  compact: boolean;
  onSelect(): void;
}

/** One request: status, method, path, the GraphQL operation, who sent it, type, size and time; marked when an override answered it. */
export function RequestRow({ request, frame, selected, compact, onSelect }: RequestRowProps) {
  const status = statusCell(request);
  return (
    <div
      role="option"
      id={`network-row-${request.id}`}
      aria-selected={selected}
      data-testid="network-row"
      data-state={request.state}
      onClick={onSelect}
      className={cn('flex h-[22px] min-w-0 items-center gap-2 border-b border-line/60 px-2', selected ? 'bg-accent/12' : 'hover:bg-hover', request.state === 'failed' && 'bg-danger/6')}
    >
      <span className={cn('w-10 shrink-0 tabular-nums', status.className)} title={request.error}>
        {status.text}
      </span>
      <span className="w-14 shrink-0 truncate text-fg-muted">{request.method}</span>
      {/* A GraphQL call reads by its operation: one URL serves them all. */}
      <span className="min-w-0 flex-1 truncate" title={request.url}>
        {request.operation ? <span className="mr-1.5 text-info">{request.operation}</span> : null}
        <span className={request.operation ? 'text-fg-subtle' : 'text-fg'}>{requestPath(request.url)}</span>
      </span>
      {request.overrideId ? (
        <span className="shrink-0 text-accent" title="An override answered it" data-testid="network-row-override">
          <Icon icon={icons.OverridesIcon} size={12} />
        </span>
      ) : null}
      {frame ? <FrameChip frameKey={frame.key} label={frame.label} title={frame.url} gone={frame.gone} /> : null}
      {request.worker ? (
        <span className="max-w-[120px] shrink-0 truncate font-sans text-[11px] text-fg-subtle" title={request.worker.url}>
          {WORKER_NAME[request.worker.type]}
        </span>
      ) : null}
      {compact ? null : (
        <>
          <span className="w-20 shrink-0 truncate text-fg-subtle">{request.type}</span>
          <span className="w-16 shrink-0 text-right tabular-nums text-fg-subtle">{formatSize(request.size)}</span>
          <span className="w-16 shrink-0 text-right tabular-nums text-fg-subtle">{formatDuration(request.duration)}</span>
        </>
      )}
    </div>
  );
}
