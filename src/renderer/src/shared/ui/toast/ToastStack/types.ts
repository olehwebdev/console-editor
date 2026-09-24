// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
export interface ToastStackProps {
  /** Placement and size of the stack. Default `bottom-4 left-4 w-[340px]`; e.g. pass `bottom-9 left-14`. */
  className?: string;
  /** Cards shown at once (collapsed and expanded). Default 3. */
  visibleCount?: number;
  /**
   * Freeze the native page view while toasts are on screen. Default false:
   * toasts are non-modal, and freezing would show a still of the page while,
   * say, a "Saved, reloading…" toast is up. Turn on only if the stack's
   * placement can overlap the page view.
   */
  registerOverlay?: boolean;
}
