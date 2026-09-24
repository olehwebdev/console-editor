/** How the toast for one kind of missed override reads, and when it's shown. */
export interface MissedToast {
  title(file: string): string;
  description: string;
  /** Offers to reload the page, which can bring the override in. */
  reload: boolean;
  /** Said once per version of the override, not every time it's reported. */
  oncePerVersion: boolean;
}
