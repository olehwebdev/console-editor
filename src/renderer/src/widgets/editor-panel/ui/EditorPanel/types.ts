import type { ComponentType } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';
import type { PageKind, PageTabOf } from '@/entities/editor-tab';

/** One view per page kind, given its own page: a new kind fails typecheck until it has one. */
export type PageViews = { [K in PageKind]: ComponentType<{ page: PageTabOf<K> }> };

/** A page tab's glyph and its tint. */
export interface PageTabIcon {
  icon: IconGlyph;
  className: string;
}
