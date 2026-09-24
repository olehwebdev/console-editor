import { KEY } from '@/shared/config';
import type { DialogKeyHandler } from './types';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
/** Enter is ignored this long after the dialog appears, so a quick double press can't confirm unseen. */
const ENTER_GUARD_MS = 150;

/** What each key does while the dialog is open; any other key is left alone. */
export const DIALOG_KEY_HANDLERS: Record<string, DialogKeyHandler> = {
  [KEY.escape]: (event, { answer }) => {
    event.preventDefault();
    event.stopPropagation();
    answer(false);
  },
  [KEY.enter]: (event, { answer, openedAt, cancel }) => {
    if (event.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    // A held Enter (e.g. the one that picked "Delete…" in a menu) must not confirm,
    // nor click the focused button natively.
    if (event.repeat || performance.now() - openedAt < ENTER_GUARD_MS) return;
    answer(document.activeElement !== cancel);
  },
  [KEY.space]: (event) => {
    // Same for a held Space: a repeat would arm the focused button and its keyup would click it.
    if (event.repeat) event.preventDefault();
  },
  [KEY.tab]: (event, { panel }) => {
    const focusables = Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (focusables.length === 0) return;
    event.preventDefault();
    const last = focusables.length - 1;
    const at = focusables.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey ? (at <= 0 ? last : at - 1) : at < 0 || at === last ? 0 : at + 1;
    focusables[next]?.focus();
  },
};
