// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { usePrimaryHost } from '../store';
import { ToastStackHost } from './ToastStackHost';
import type { ToastStackProps } from './types';

/**
 * Renders the toasts raised with `toast()`. Mount exactly once near the root
 * (if several are mounted, only the first to register renders, so don't add
 * one in a subtree). Cards stack while idle and fan out on hover or focus
 * (timers pause meanwhile); swipe sideways or press Esc on a card to dismiss it.
 * New toasts are announced politely to screen readers; see `focusToasts()`.
 */
export function ToastStack(props: ToastStackProps) {
  const primary = usePrimaryHost();
  return primary ? <ToastStackHost {...props} /> : null;
}
