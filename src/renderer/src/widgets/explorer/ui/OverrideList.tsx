import { AnimatePresence, motion } from 'motion/react';
import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { OverrideMeta } from '@common/types';
import { icons } from '@/shared/config';
import { cn, EASE_OUT, fileName, hostOf } from '@/shared/lib';
import { Counter } from '@/shared/ui/counter';
import { HoverHighlight } from '@/shared/ui/hover-highlight';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { ContextMenu, type MenuItem } from '@/shared/ui/menu';
import { Switch } from '@/shared/ui/switch';
import { Tooltip } from '@/shared/ui/tooltip';
import { selectActiveTab, useTabStore } from '@/entities/editor-tab';
import { selectOverrideList, useOverrideStore } from '@/entities/override';
import { KindIcon } from '@/entities/resource';
import { deleteOverride } from '@/features/delete-override';
import { useResourceFilter } from '@/features/filter-resources';
import { openOverride } from '@/features/open-resource';
import { setOverrideEnabled } from '@/features/toggle-override';

function OverrideRow({ override, active }: { override: OverrideMeta; active: boolean }) {
  const hits = useOverrideStore((s) => s.hits[override.id] ?? 0);
  const changed = useOverrideStore((s) => !!s.upstreamChanged[override.id]);

  const items: MenuItem[] = [
    { label: 'Open', icon: icons.FileIcon, onSelect: () => void openOverride(override.id) },
    { label: override.enabled ? 'Turn off' : 'Turn on', icon: icons.LiveIcon, onSelect: () => void setOverrideEnabled(override.id, !override.enabled) },
    { label: 'Copy URL', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(override.sourceUrl) },
    { separator: true },
    { label: 'Delete override', icon: icons.DeleteIcon, danger: true, onSelect: () => void deleteOverride(override.id) },
  ];

  return (
    <ContextMenu items={items} label={`${fileName(override.sourceUrl)} actions`}>
      <div
        role="listitem"
        data-hover-row
        data-override-id={override.id}
        title={`${override.sourceUrl}\nmatch (${override.match.type}): ${override.match.pattern}`}
        onClick={() => void openOverride(override.id)}
        className={cn(
          'group relative flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-[13px]',
          active && 'bg-accent/10 text-fg before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent',
        )}
      >
        <span onClick={(e) => e.stopPropagation()} className="flex">
          <Switch
            size="sm"
            tone="live"
            checked={override.enabled}
            onCheckedChange={(on) => void setOverrideEnabled(override.id, on)}
            aria-label={override.enabled ? 'Turn override off' : 'Turn override on'}
          />
        </span>
        <KindIcon kind={override.kind} size={14} />
        <span className={cn('min-w-0 flex-1 truncate', override.enabled ? 'text-fg' : 'text-fg-subtle line-through decoration-fg-subtle/60')}>
          {fileName(override.sourceUrl)}
          <span className="ml-1.5 text-[11px] text-fg-subtle no-underline">{hostOf(override.sourceUrl)}</span>
        </span>
        {override.match.type !== 'exact' ? (
          <span className="rounded-full bg-hover px-1.5 font-mono text-[10px] text-fg-muted">{override.match.type}</span>
        ) : null}
        {changed ? (
          <Tooltip content="The live file changed since this override was created">
            <span className="flex text-warning">
              <Icon icon={icons.WarningIcon} size={14} />
            </span>
          </Tooltip>
        ) : null}
        {hits > 0 ? (
          <Tooltip content={`Served ${hits}× this session`}>
            <span data-testid="override-hits" className="min-w-5 rounded-full bg-live/15 px-1.5 text-center text-[10.5px] font-medium text-live">
              <Counter value={hits} />
            </span>
          </Tooltip>
        ) : null}
        <IconButton
          icon={icons.DeleteIcon}
          label="Delete override"
          size="sm"
          danger
          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            void deleteOverride(override.id);
          }}
        />
      </div>
    </ContextMenu>
  );
}

/**
 * The user's overrides: on/off switches, hit counters, upstream warnings.
 * Memoized: the Explorer re-renders as page files arrive, and every render of
 * the list would make Motion measure the layout of its rows.
 */
export const OverrideList = memo(function OverrideList() {
  const overrides = useOverrideStore(useShallow(selectOverrideList));
  const query = useResourceFilter((s) => s.query.toLowerCase());
  const activeOverrideId = useTabStore((s) => selectActiveTab(s)?.overrideId ?? null);
  const visible = overrides
    .filter((o) => !query || o.sourceUrl.toLowerCase().includes(query) || o.match.pattern.toLowerCase().includes(query))
    .sort((a, b) => fileName(a.sourceUrl).localeCompare(fileName(b.sourceUrl)));

  if (!overrides.length) {
    return (
      <p className="px-3 pb-2 text-[12px] leading-relaxed text-fg-subtle">
        Open a file from the page, edit it and press <span className="text-fg-muted">Ctrl/Cmd+S</span>. Your version is served instead of the live one.
      </p>
    );
  }
  return (
    <HoverHighlight className="px-1.5 pb-1" role="list" aria-label="Overrides">
      <AnimatePresence initial={false}>
        {visible.map((o) => (
          <motion.div
            key={o.id}
            layout="position"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            <OverrideRow override={o} active={o.id === activeOverrideId} />
          </motion.div>
        ))}
      </AnimatePresence>
    </HoverHighlight>
  );
});
