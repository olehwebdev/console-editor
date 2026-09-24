import { useShallow } from 'zustand/react/shallow';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Counter } from '@/shared/ui/counter';
import { Icon } from '@/shared/ui/icon';
import { Spinner } from '@/shared/ui/spinner';
import { selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { selectEnabledCount, selectOverrideList, useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { KIND_NAME, useResourceStore } from '@/entities/resource';

/** Quiet one-line summary: page state, what is being served, the active file. */
export function StatusBar() {
  const loading = usePageStore((s) => s.page.loading);
  const title = usePageStore((s) => s.page.title);
  const url = usePageStore((s) => s.page.url);
  const live = useOverrideStore(selectEnabledCount);
  const total = useOverrideStore(useShallow((s) => selectOverrideList(s).length));
  const iframes = useResourceStore((s) => new Set(Object.values(s.byKey).flatMap((e) => (e.frame ? [e.frame.url] : []))).size);
  const active = useTabStore(useShallow((s) => {
    const t = selectActiveTab(s);
    return t ? { kind: t.kind, lite: t.lite } : null;
  }));

  return (
    <footer className="flex h-[var(--statusbar-h)] shrink-0 items-center gap-4 border-t border-line bg-canvas px-3 text-[11.5px] text-fg-subtle" data-testid="status-bar">
      <span className="flex min-w-0 items-center gap-1.5" title={url}>
        {loading ? <Spinner size={11} className="text-accent" /> : <span className={cn('size-1.5 rounded-full', url ? 'bg-live' : 'bg-fg-subtle/50')} />}
        <span className="truncate">{loading ? 'Loading…' : title || url || 'No page loaded'}</span>
      </span>
      <span className="flex items-center gap-1.5" data-testid="status-overrides">
        <Icon icon={icons.LiveIcon} size={12} className={live ? 'text-live' : undefined} />
        {total ? (
          <span>
            <Counter value={live} className={live ? 'text-fg-muted' : undefined} />/{total} overrides live
          </span>
        ) : (
          <span>No overrides</span>
        )}
      </span>
      {iframes ? (
        <span className="flex items-center gap-1.5">
          <Icon icon={icons.IframeIcon} size={12} className="text-info" />
          <Counter value={iframes} /> {iframes === 1 ? 'iframe' : 'iframes'}
        </span>
      ) : null}
      <span className="flex-1" />
      {active ? (
        <span className="flex items-center gap-3">
          {active.lite ? <span className="text-warning/80">highlight only</span> : null}
          <span>{KIND_NAME[active.kind]}</span>
          <span>UTF-8</span>
        </span>
      ) : null}
    </footer>
  );
}
