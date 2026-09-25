import type { ComponentType } from 'react';
import type { PaneTab } from '@/shared/ui/pane-tabs';
import type { DetailTab } from '../../model';
import { HeadersView } from './HeadersView';
import { MessagesView } from './MessagesView';
import { PayloadView } from './PayloadView';
import { ResponseView } from './ResponseView';
import type { DetailViewProps } from './types';

/** The details pane's views of a request, in order. */
export const DETAIL_TAB_LIST: readonly PaneTab<DetailTab>[] = [
  { id: 'headers', label: 'Headers' },
  { id: 'payload', label: 'Payload' },
  { id: 'response', label: 'Response' },
];

/** A WebSocket's: its handshake's headers, then what went back and forth. */
export const SOCKET_TAB_LIST: readonly PaneTab<DetailTab>[] = [
  { id: 'headers', label: 'Headers' },
  { id: 'messages', label: 'Messages' },
];

/** The view each tab shows: a new tab fails typecheck until it has one. */
export const DETAIL_VIEWS: Record<DetailTab, ComponentType<DetailViewProps>> = {
  headers: HeadersView,
  payload: PayloadView,
  response: ResponseView,
  messages: MessagesView,
};
