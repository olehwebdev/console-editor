import type { ComponentType } from 'react';
import type { PageKind, PageTabOf } from '@/entities/editor-tab';
import { PAGE_VIEWS } from './pageViews';

/** The view of a page tab. Generic so each kind reaches its own view without a cast. Key it by the page, so each starts afresh. */
export function PageView<K extends PageKind>({ page }: { page: PageTabOf<K> }) {
  const View: ComponentType<{ page: PageTabOf<K> }> = PAGE_VIEWS[page.page];
  return <View page={page} />;
}
