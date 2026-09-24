import { hostOf, pathSegments } from '@/shared/lib';
import { icons } from '@/shared/config';
import { Badge } from '@/shared/ui/badge';
import { Button, Swap } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { type TabMeta, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { KindIcon } from '@/entities/resource';
import { closeDiff, compareWithLive, showBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { saveTab } from '@/features/save-override';
import { Banners } from './Banners';
import { MatchRule } from './MatchRule';

function Breadcrumbs({ url }: { url: string }) {
  const segments = pathSegments(url);
  return (
    <nav aria-label="File location" className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-[12.5px]" title={url}>
      <span className="shrink-0 text-fg-subtle">{hostOf(url)}</span>
      {segments.map((segment, i) => (
        <span key={i} className={i === segments.length - 1 ? 'flex min-w-0 items-center gap-1 text-fg' : 'hidden shrink-0 items-center gap-1 text-fg-subtle sm:flex'}>
          <Icon icon={icons.ChevronRightIcon} size={12} className="text-fg-subtle/60" />
          <span className={i === segments.length - 1 ? 'truncate font-medium' : undefined}>{segment}</span>
        </span>
      ))}
    </nav>
  );
}

/** Location, state and actions for the active tab, plus its match rule and hints. */
export function FileHeader({ tab }: { tab: TabMeta }) {
  const override = useOverrideStore((s) => (tab.overrideId ? s.byId[tab.overrideId] : undefined));
  const diff = useTabStore((s) => s.diff);
  const saved = !!override && !tab.dirty;

  return (
    <div className="shrink-0 border-b border-line bg-surface-editor" data-testid="file-header">
      <div className="flex h-10 items-center gap-2 px-3">
        <KindIcon kind={tab.kind} size={15} />
        <Breadcrumbs url={tab.url} />
        {override ? (
          <Badge tone={override.enabled ? 'live' : 'neutral'} dot pulse={override.enabled}>
            {override.enabled ? 'Override live' : 'Override off'}
          </Badge>
        ) : (
          <Badge tone="neutral">Live file</Badge>
        )}
        <div className="ml-1 flex items-center gap-0.5">
          <IconButton icon={icons.PrettifyIcon} label="Pretty-print" shortcut={['shift', 'alt', 'F']} onClick={() => void formatTab(tab.id)} />
          <IconButton
            icon={icons.DiffIcon}
            label={diff === 'base' ? 'Close diff' : 'Diff with where you started'}
            shortcut={['mod', 'shift', 'D']}
            active={diff === 'base'}
            onClick={() => (diff === 'base' ? closeDiff() : void showBaseDiff(tab.id))}
          />
          {override ? (
            <IconButton
              icon={icons.GlobeIcon}
              label={diff === 'live' ? 'Close compare' : 'Compare with the live file'}
              active={diff === 'live'}
              onClick={() => (diff === 'live' ? closeDiff() : void compareWithLive(tab.id))}
            />
          ) : null}
        </div>
        <Button
          size="sm"
          variant={saved ? 'ghost' : 'primary'}
          loading={tab.saving}
          disabled={saved}
          leading={<Icon icon={saved ? icons.CheckIcon : icons.SaveIcon} size={14} />}
          onClick={() => void saveTab(tab.id)}
          data-testid="save-button"
          title={override ? 'Save and reload (Ctrl/Cmd+S)' : 'Serve this file instead of the live one (Ctrl/Cmd+S)'}
        >
          <Swap value={saved ? 'saved' : override ? 'save' : 'create'}>{saved ? 'Saved' : override ? 'Save' : 'Create override'}</Swap>
        </Button>
      </div>
      {override ? <MatchRule override={override} /> : null}
      <Banners override={override} lite={tab.lite} tabId={tab.id} />
    </div>
  );
}
