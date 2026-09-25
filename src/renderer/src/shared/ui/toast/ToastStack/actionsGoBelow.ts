// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ToastRecord } from '../store';

/** With an action, a title or description longer than this (in characters) moves the actions to a row of their own. */
const LONG_TEXT = { title: 32, description: 64 } as const;

/** Two actions, or one beside long text, get a row of their own so the text keeps its width. */
export function actionsGoBelow(t: ToastRecord): boolean {
  const long = (node: unknown, max: number) => typeof node === 'string' && node.length > max;
  return !!t.secondaryAction || (!!t.action && (long(t.title, LONG_TEXT.title) || long(t.description, LONG_TEXT.description)));
}
