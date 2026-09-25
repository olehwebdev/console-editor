export interface PaneTab<T extends string> {
  id: T;
  label: string;
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
