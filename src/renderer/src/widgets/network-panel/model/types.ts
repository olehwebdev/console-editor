/** The details pane's views of the selected request. */
export const DETAIL_TABS = ['headers', 'payload', 'response', 'messages'] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

export interface NetworkSelection {
  /** The request whose details show; they close once it leaves the log. */
  selectedId: string | null;
  /** The details view shown, kept as you go from request to request. */
  tab: DetailTab;

  select(id: string | null): void;
  setTab(tab: DetailTab): void;
}
