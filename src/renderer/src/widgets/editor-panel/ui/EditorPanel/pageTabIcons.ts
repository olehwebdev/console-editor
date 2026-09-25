import { icons } from '@/shared/config';
import type { PageKind } from '@/entities/editor-tab';
import type { PageTabIcon } from './types';

/** Each page kind's tab glyph. */
export const PAGE_TAB_ICONS: Record<PageKind, PageTabIcon> = {
  'whats-new': { icon: icons.WhatsNewIcon, className: 'text-accent' },
  stack: { icon: icons.StackIcon, className: 'text-accent' },
  component: { icon: icons.ComponentIcon, className: 'text-info' },
  rule: { icon: icons.RulesIcon, className: 'text-fg-muted' },
  'new-rule': { icon: icons.RulesIcon, className: 'text-fg-muted' },
};
