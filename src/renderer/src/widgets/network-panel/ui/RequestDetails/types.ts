import type { NetworkRequest, NetworkRequestDetail } from '@common/types';

/** What each details view is given: the request, and its headers and body once read. */
export interface DetailViewProps {
  request: NetworkRequest;
  detail?: NetworkRequestDetail;
}
