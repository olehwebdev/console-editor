export interface PaneTab<T extends string> {
  id: T;
  label: string;
  /** Something waiting in the view (requests paused at a breakpoint): a warning-toned count beside the label while above zero. */
  count?: number;
  /** Something running in the view (the Renders log recording): a small red dot beside the label. */
  live?: boolean;
}

export interface PaneTabsProps<T extends string> {
  tabs: readonly PaneTab<T>[];
  value: T;
  onChange(id: T): void;
  /** Names the strip for assistive tech ("Bottom panel", "Request details"). */
  label: string;
  /** Set as the pane's heading: small capitals, as `label-caps`. */
  caps?: boolean;
  className?: string;
}
