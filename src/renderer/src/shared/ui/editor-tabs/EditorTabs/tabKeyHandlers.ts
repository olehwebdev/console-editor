// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { KEY } from '@/shared/config';
import { isMac } from '@/shared/lib';
import type { TabKeyHandler } from './types';

/** What each unmodified key does on a focused tab; any other key is left alone. */
export const TAB_KEY_HANDLERS: Record<string, TabKeyHandler> = {
  [KEY.arrowRight]: ({ tabs, index }) => tabs[(index + 1) % tabs.length]?.focus(),
  [KEY.arrowLeft]: ({ tabs, index }) => tabs[(index - 1 + tabs.length) % tabs.length]?.focus(),
  [KEY.home]: ({ tabs }) => tabs[0]?.focus(),
  [KEY.end]: ({ tabs }) => tabs[tabs.length - 1]?.focus(),
  [KEY.enter]: ({ select }) => select(),
  [KEY.space]: ({ select }) => select(),
  // Backspace only where the key is labelled "delete" and there is no forward delete.
  [KEY.backspace]: ({ close }) => (isMac ? close() : false),
  [KEY.delete]: ({ close }) => close(),
};
