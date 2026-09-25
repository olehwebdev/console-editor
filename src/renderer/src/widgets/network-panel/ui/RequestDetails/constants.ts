import type { ComponentType } from 'react';
import type { PaneTab } from '@/shared/ui/pane-tabs';
import type { DetailTab } from '../../model';
import { HeadersView } from './HeadersView';
import { PayloadView } from './PayloadView';
import { ResponseView } from './ResponseView';
import type { DetailViewProps } from './types';

/** The details pane's views, in order. */
export const DETAIL_TAB_LIST: readonly PaneTab<DetailTab>[] = [
  { id: 'headers', label: 'Headers' },
  { id: 'payload', label: 'Payload' },
  { id: 'response', label: 'Response' },
];

/** The view each tab shows: a new tab fails typecheck until it has one. */
export const DETAIL_VIEWS: Record<DetailTab, ComponentType<DetailViewProps>> = {
  headers: HeadersView,
  payload: PayloadView,
  response: ResponseView,
};
