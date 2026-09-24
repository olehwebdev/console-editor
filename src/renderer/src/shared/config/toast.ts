/** How long a toast stays on screen, in milliseconds, by what it says. */
export const TOAST_DURATION = {
  /** Until it is updated or dismissed: a pending operation's toast. */
  pending: 0,
  /** A quick confirmation that needs no reading ("Formatted"). */
  brief: 2000,
  /** A confirmation with a detail worth a glance ("Saved app.js"). */
  confirm: 2500,
  /** The default, and warnings. */
  normal: 4000,
  /** An operation that failed. */
  failure: 5000,
  /** The default for `danger`, and failures to open a file. */
  danger: 6000,
  /** A warning that explains a cause and offers an action. */
  actionable: 8000,
} as const;
