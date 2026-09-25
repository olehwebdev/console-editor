import { SOCKET_TYPE } from '@common/constants';
import type { NetworkRequest } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { PaneTabs } from '@/shared/ui/pane-tabs';
import { useNetworkSelection } from '../../model';
import { DETAIL_TAB_LIST, DETAIL_VIEWS, SOCKET_TAB_LIST } from './constants';
import { DetailActions } from './DetailActions';
import { useRequestDetail } from './useRequestDetail';

// Actions never change, so they are read once instead of subscribed to.
const { select, setTab } = useNetworkSelection.getState();

/** The selected request beside the list: its headers, payload or response, and what can be done with it. */
export function RequestDetails({ request }: { request: NetworkRequest }) {
  const chosen = useNetworkSelection((s) => s.tab);
  const result = useRequestDetail(request);
  const tabs = request.type === SOCKET_TYPE ? SOCKET_TAB_LIST : DETAIL_TAB_LIST;
  // A view this request lacks (a socket has no response body) shows its first instead; the choice is kept for the next.
  const tab = tabs.some((t) => t.id === chosen) ? chosen : tabs[0]!.id;
  const View = DETAIL_VIEWS[tab];

  return (
    <aside aria-label="Request details" data-testid="network-details" className="flex min-h-0 min-w-0 flex-1 flex-col border-line @min-[44rem]:border-l">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line pl-1.5 pr-1">
        <PaneTabs tabs={tabs} value={tab} onChange={setTab} label="Request details" className="min-w-0 flex-1" />
        <DetailActions request={request} detail={result?.detail} />
        <IconButton icon={icons.CloseIcon} label="Close the details" size="sm" onClick={() => select(null)} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2.5">
        {result?.error ? <p className="mb-3 text-[12px] text-danger">{result.error}</p> : null}
        <View key={request.id} request={request} detail={result?.detail} />
      </div>
    </aside>
  );
}
