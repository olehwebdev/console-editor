// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useEffect, useRef } from 'react';
import { toast, type ToastRecord } from '../store';

/** Dismisses the toast once its duration has run, counting only the time the stack is collapsed. */
export function useAutoDismiss(t: ToastRecord, expanded: boolean) {
  // Auto-dismiss; the clock stops while the stack is expanded (hovered or focused), and starts over when the toast is updated.
  const clock = useRef({ version: t.version, remaining: t.duration });
  useEffect(() => {
    if (clock.current.version !== t.version) clock.current = { version: t.version, remaining: t.duration };
    if (expanded || !Number.isFinite(t.duration) || t.duration <= 0) return;
    const run = clock.current;
    const started = Date.now();
    const timer = window.setTimeout(() => toast.dismiss(t.id), Math.max(0, run.remaining));
    return () => {
      window.clearTimeout(timer);
      run.remaining -= Date.now() - started;
    };
  }, [expanded, t.id, t.version, t.duration]);
}
