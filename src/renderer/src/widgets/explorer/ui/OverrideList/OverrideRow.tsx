import { RESPONSE_KIND } from '@common/overrides';
import type { OverrideMeta } from '@common/types';
import { icons } from '@/shared/config';
import { cn, hostOf } from '@/shared/lib';
import { Counter } from '@/shared/ui/counter';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { ContextMenu, type MenuItem } from '@/shared/ui/menu';
import { Switch } from '@/shared/ui/switch';
import { Tooltip } from '@/shared/ui/tooltip';
import { overrideLabel, useOverrideStore } from '@/entities/override';
import { KindIcon } from '@/entities/resource';
import { deleteOverride } from '@/features/delete-override';
import { openInEditor, showOverrideFile } from '@/features/override/external-editor';
import { openOverride } from '@/features/open-resource';
import { setOverrideEnabled } from '@/features/toggle-override';
import { ROW_ICON_SIZE } from '../constants';
import { ResponseBadges } from './ResponseBadges';

/** One override: its switch, file, badges and actions (also in its context menu). */
export function OverrideRow({ override, active }: { override: OverrideMeta; active: boolean }) {
  const hits = useOverrideStore((s) => s.hits[override.id] ?? 0);
  const changed = useOverrideStore((s) => !!s.upstreamChanged[override.id]);
  const label = overrideLabel(override.sourceUrl, override.request);

  const items: MenuItem[] = [
    { label: 'Open', icon: icons.FileIcon, onSelect: () => void openOverride(override.id) },
    { label: 'Open in VS Code', icon: icons.ExternalLinkIcon, onSelect: () => void openInEditor(override.id) },
    { label: 'Show in folder', icon: icons.FolderOpenIcon, onSelect: () => void showOverrideFile(override.id) },
    { label: override.enabled ? 'Turn off' : 'Turn on', icon: icons.LiveIcon, onSelect: () => void setOverrideEnabled(override.id, !override.enabled) },
    { label: 'Copy URL', icon: icons.CopyIcon, onSelect: () => void navigator.clipboard.writeText(override.sourceUrl) },
    { separator: true },
    { label: 'Delete override', icon: icons.DeleteIcon, danger: true, onSelect: () => void deleteOverride(override.id) },
  ];

  return (
    <ContextMenu items={items} label={`${label} actions`}>
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
        <KindIcon kind={override.kind} size={ROW_ICON_SIZE} />
        <span className={cn('min-w-0 flex-1 truncate', override.enabled ? 'text-fg' : 'text-fg-subtle line-through decoration-fg-subtle/60')}>
          {label}
          <span className="ml-1.5 text-[11px] text-fg-subtle no-underline">{hostOf(override.sourceUrl)}</span>
        </span>
        {override.kind === RESPONSE_KIND ? <ResponseBadges override={override} /> : null}
        {override.match.type !== 'exact' ? (
          <span className="rounded-full bg-hover px-1.5 font-mono text-[10px] text-fg-muted">{override.match.type}</span>
        ) : null}
        {changed ? (
          <Tooltip content="The live file changed since this override was created">
            <span className="flex text-warning">
              <Icon icon={icons.WarningIcon} size={ROW_ICON_SIZE} />
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
