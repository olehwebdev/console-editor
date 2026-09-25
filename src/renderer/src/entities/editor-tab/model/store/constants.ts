import type { PageKind, PageScope } from './types';

/** Which pages belong to the workspace shown: they close when it changes. */
export const PAGE_SCOPES = { 'whats-new': 'app', rule: 'workspace', 'new-rule': 'workspace' } as const satisfies Record<PageKind, PageScope>;
