import { useShallow } from 'zustand/react/shallow';
import { NO_THROTTLING } from '@common/throttling';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Counter } from '@/shared/ui/counter';
import { Icon } from '@/shared/ui/icon';
import { Spinner } from '@/shared/ui/spinner';
import { selectActiveSource, selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { useHeldStore } from '@/entities/held-request';
import { selectEnabledCount, selectOverrideList, useOverrideStore } from '@/entities/override';
import { usePageStore } from '@/entities/page';
import { THROTTLING_LABELS, useSettingsStore } from '@/entities/settings';
import { KIND_NAME, selectIframeCount, selectWorkerCount, useResourceStore } from '@/entities/resource';
import { UpdateStatus } from '@/features/update-app';
import { ITEM_ICON_SIZE } from './constants';
import { StackChip } from './StackChip';

/** Quiet one-line summary: page state, what is being served, the active file. */
export function StatusBar() {
  const loading = usePageStore((s) => s.page.loading);
  const title = usePageStore((s) => s.page.title);
  const url = usePageStore((s) => s.page.url);
  const live = useOverrideStore(selectEnabledCount);
  const total = useOverrideStore(useShallow((s) => selectOverrideList(s).length));
  const iframes = useResourceStore(selectIframeCount);
  const workers = useResourceStore(selectWorkerCount);
  const paused = useHeldStore((s) => s.held.length);
  const throttling = useSettingsStore((s) => s.settings.throttling);
  // The active file's language, or an original's (read-only).
  const active = useTabStore(
    useShallow((s) => {
      const t = selectActiveTab(s);
      if (t) return { language: KIND_NAME[t.kind], lite: t.lite, readOnly: false };
      const source = selectActiveSource(s);
      return source ? { language: source.languageName, lite: source.lite, readOnly: true } : null;
    }),
  );

  return (
    <footer className="flex h-[var(--statusbar-h)] shrink-0 items-center gap-4 border-t border-line bg-canvas px-3 text-[11.5px] text-fg-subtle" data-testid="status-bar">
      <span className="flex min-w-0 items-center gap-1.5" title={url}>
        {loading ? <Spinner size={11} className="text-accent" /> : <span className={cn('size-1.5 rounded-full', url ? 'bg-live' : 'bg-fg-subtle/50')} />}
        <span className="truncate">{loading ? 'Loading…' : title || url || 'No page loaded'}</span>
      </span>
      <span className="flex items-center gap-1.5" data-testid="status-overrides">
        <Icon icon={icons.LiveIcon} size={ITEM_ICON_SIZE} className={live ? 'text-live' : undefined} />
        {total ? (
          <span>
            <Counter value={live} className={live ? 'text-fg-muted' : undefined} />/{total} overrides live
          </span>
        ) : (
          <span>No overrides</span>
        )}
      </span>
      {throttling !== NO_THROTTLING ? (
        <span className="flex items-center gap-1.5 text-warning" data-testid="status-throttling">
          <Icon icon={icons.ThrottleIcon} size={ITEM_ICON_SIZE} />
          {THROTTLING_LABELS[throttling]}
        </span>
      ) : null}
      {paused ? (
        <span className="flex items-center gap-1.5 text-warning" data-testid="status-paused">
          <Icon icon={icons.PauseIcon} size={ITEM_ICON_SIZE} />
          <Counter value={paused} /> paused
        </span>
      ) : null}
      {iframes ? (
        <span className="flex items-center gap-1.5">
          <Icon icon={icons.IframeIcon} size={ITEM_ICON_SIZE} className="text-info" />
          <Counter value={iframes} /> {iframes === 1 ? 'iframe' : 'iframes'}
        </span>
      ) : null}
      {workers ? (
        <span className="flex items-center gap-1.5" data-testid="status-workers" data-count={workers}>
          <Icon icon={icons.WorkerIcon} size={ITEM_ICON_SIZE} className="text-info" />
          <Counter value={workers} /> {workers === 1 ? 'worker' : 'workers'}
        </span>
      ) : null}
      <StackChip />
      <span className="flex-1" />
      <UpdateStatus />
      {active ? (
        <span className="flex items-center gap-3">
          {active.lite ? <span className="text-warning/80">highlight only</span> : null}
          <span>{active.language}</span>
          {active.readOnly ? <span data-testid="status-read-only">Read-only</span> : null}
          <span>UTF-8</span>
        </span>
      ) : null}
    </footer>
  );
}
