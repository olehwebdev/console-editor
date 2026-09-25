import { useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNetworkStore } from '@/entities/network-request';
import { matchesNetworkFilter, useNetworkFilter } from '@/features/network/filter';
import { useNetworkSelection } from '../../model';
import { RequestDetails } from '../RequestDetails';
import { HeldStrip } from './HeldStrip';
import { NetworkToolbar } from './NetworkToolbar';
import { RequestList } from './RequestList';
import { useFrameResolver } from './useFrameResolver';

export interface NetworkPanelProps {
  /** What names the panel in its toolbar: the bottom pane's tabs. */
  heading: ReactNode;
  onClose(): void;
}

/**
 * The requests of the page, its iframes and its workers, newest at the bottom, each tagged with the
 * frame that sent it. Selecting one shows its headers, payload and response beside the list, and
 * opens its response for overriding.
 */
export function NetworkPanel({ heading, onClose }: NetworkPanelProps) {
  const requests = useNetworkStore((s) => s.requests);
  const filter = useNetworkFilter(useShallow((s) => ({ group: s.group, text: s.text })));
  const selectedId = useNetworkSelection((s) => s.selectedId);
  const resolve = useFrameResolver();

  const shown = useMemo(() => requests.filter((r) => matchesNetworkFilter(r, filter)), [requests, filter]);
  // Its details close once it leaves the log (cleared, or an earlier page's).
  const selected = selectedId === null ? undefined : requests.find((r) => r.id === selectedId);

  return (
    <section aria-label="Network" data-testid="network-panel" className="flex h-full min-h-0 flex-col bg-surface-editor">
      <NetworkToolbar heading={heading} onClose={onClose} />
      <HeldStrip />
      {/* Narrower than 44rem, a request's details take the whole panel; closing them brings the list back. */}
      <div className="@container flex min-h-0 flex-1">
        {shown.length ? (
          <RequestList requests={shown} resolve={resolve} compact={!!selected} />
        ) : (
          <p className="min-w-0 flex-1 px-3 py-2 text-[12px] text-fg-subtle">
            {requests.length ? 'No requests match the filters.' : 'No requests yet. The page’s requests show up here as it makes them; reload it to see the ones it loads with.'}
          </p>
        )}
        {selected ? <RequestDetails request={selected} /> : null}
      </div>
    </section>
  );
}
