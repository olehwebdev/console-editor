import type { NetworkRequest, NetworkRequestDetail } from '@common/types';

/** What each details view is given: the request, and its headers and body once read. */
export interface DetailViewProps {
  request: NetworkRequest;
  detail?: NetworkRequestDetail;
}

/** What was read of a request (its details, its response's body), or why it couldn't be; tagged with the request. */
export interface RequestRead<T> {
  id: string;
  value?: T;
  error?: string;
}
