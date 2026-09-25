import type { TabMeta } from '@/entities/editor-tab';

/** Whether a tab shows the page's own document, which rules never block. A #fragment doesn't make it another document. */
export function isPageDocument(tab: Pick<TabMeta, 'url' | 'kind'>, pageUrl: string): boolean {
  if (tab.kind !== 'Document' || !URL.canParse(tab.url) || !URL.canParse(pageUrl)) return false;
  const [file, page] = [new URL(tab.url), new URL(pageUrl)];
  file.hash = '';
  page.hash = '';
  return file.href === page.href;
}
