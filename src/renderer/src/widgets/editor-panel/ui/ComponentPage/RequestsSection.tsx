import { useMemo } from 'react';
import type { InspectedComponent } from '@common/types';
import { fileName, formatTime } from '@/shared/lib';
import { locationKey, useInspectorStore } from '@/entities/inspector';
import { requestPath, useNetworkStore } from '@/entities/network-request';
import { CodeLink } from '@/features/open-resource';
import { MAX_COMPONENT_REQUESTS } from './constants';
import { requestsFrom } from './requestsFrom';

/**
 * The requests its frame sent from the component's original file (a call of the script that sent each is
 * there), the newest first: method, path, status and the call. Needs the original, through the map.
 */
export function RequestsSection({ component }: { component: InspectedComponent }) {
  const location = component.chain[component.depth]?.location;
  const file = useInspectorStore((s) => (location ? s.origins[locationKey(location)]?.url : undefined));
  const origins = useInspectorStore((s) => s.origins);
  const requests = useNetworkStore((s) => s.requests);
  // Up to thousands of requests with their initiators' calls: matched once per change, not per render.
  const sent = useMemo(() => (file ? requestsFrom(requests, file, component.frameId, origins) : []), [requests, file, component.frameId, origins]);
  if (!file) return null;
  return (
    <section className="flex flex-col gap-1.5" data-testid="component-requests">
      <h2 className="label-caps">Requests{sent.length ? ` · ${sent.length}` : ''}</h2>
      {sent.length ? (
        <div className="flex flex-col rounded-xl border border-line bg-surface py-1">
          {sent.slice(0, MAX_COMPONENT_REQUESTS).map(({ request, call }) => (
            <div key={request.id} className="flex min-h-7 min-w-0 items-center gap-3 px-3.5 py-0.5 text-[12.5px]" data-testid="component-request">
              <span className="shrink-0 tabular-nums text-fg-subtle">{formatTime(request.startedAt)}</span>
              <span className="shrink-0 font-mono text-fg-muted">{request.method}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-fg" title={request.url}>
                {request.operation ?? requestPath(request.url)}
              </span>
              <span className="shrink-0 tabular-nums text-fg-subtle">{request.status || request.state}</span>
              <CodeLink location={call} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-fg-subtle">No request has been sent from {fileName(file)} since the Network panel's list started.</p>
      )}
    </section>
  );
}
