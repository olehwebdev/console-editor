import type { DrivenTab } from '@common/types';

/** A tab's title (its address when it has none) over its address. */
export function TabText({ tab }: { tab: Pick<DrivenTab, 'title' | 'url'> }) {
  return (
    <>
      <span className="truncate text-[13px] text-fg">{tab.title || tab.url}</span>
      <span className="truncate font-mono text-[11px] text-fg-subtle">{tab.url}</span>
    </>
  );
}
