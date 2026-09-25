import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { hostOf, pathSegments } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { Button, Swap } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { type TabMeta, useTabStore } from '@/entities/editor-tab';
import { useOverrideStore } from '@/entities/override';
import { KindIcon } from '@/entities/resource';
import { isMappableKind, useSourceMapStore } from '@/entities/source-map';
import { closeDiff, compareWithLive, showBaseDiff } from '@/features/compare-changes';
import { formatTab } from '@/features/format-document';
import { bundleUrlOf, goToOriginal } from '@/features/open-resource';
import { saveTab } from '@/features/save-override';
import { Banners } from '../Banners';
import { Breadcrumbs } from '../Breadcrumbs';
import { MatchRule } from '../MatchRule';

/** The Save button's states: the key its Swap rolls on, and the label. */
const SAVE_STATE = {
  saved: { key: 'saved', label: 'Saved' },
  save: { key: 'save', label: 'Save' },
  create: { key: 'create', label: 'Create override' },
} as const;

/** Location, state and actions for the active tab, plus its match rule and hints. */
export function FileHeader({ tab }: { tab: TabMeta }) {
  const override = useOverrideStore((s) => (tab.overrideId ? s.byId[tab.overrideId] : undefined));
  const diff = useTabStore((s) => s.diff);
  const saved = !!override && !tab.dirty;
  const saveState = saved ? SAVE_STATE.saved : override ? SAVE_STATE.save : SAVE_STATE.create;
  // Offered on scripts and stylesheets until the file is known to have no map.
  const noMap = useSourceMapStore((s) => s.byBundle[bundleUrlOf(tab)]?.status === 'none');
  const mappable = isMappableKind(tab.kind) && !noMap;

  return (
    <div className="shrink-0 border-b border-line bg-surface-editor" data-testid="file-header">
      <div className="flex h-10 items-center gap-2 px-3">
        <KindIcon kind={tab.kind} size={15} />
        <Breadcrumbs root={hostOf(tab.url)} segments={pathSegments(tab.url)} title={tab.url} />
        {override ? (
          <Badge tone={override.enabled ? 'live' : 'neutral'} dot pulse={override.enabled}>
            {override.enabled ? 'Override live' : 'Override off'}
          </Badge>
        ) : (
          <Badge tone="neutral">Live file</Badge>
        )}
        <div className="ml-1 flex items-center gap-0.5">
          {mappable ? (
            <IconButton
              icon={icons.JumpIcon}
              label="Go to original source"
              shortcut={SHORTCUT.jumpToMapped}
              data-testid="go-to-original"
              onClick={() => void goToOriginal(tab.id)}
            />
          ) : null}
          <IconButton icon={icons.PrettifyIcon} label="Pretty-print" shortcut={SHORTCUT.format} onClick={() => void formatTab(tab.id)} />
          <IconButton
            icon={icons.DiffIcon}
            label={diff === 'base' ? 'Close diff' : 'Diff with where you started'}
            shortcut={SHORTCUT.diff}
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
          <Swap value={saveState.key}>{saveState.label}</Swap>
        </Button>
      </div>
      {override ? <MatchRule key={override.id} override={override} /> : null}
      <Banners override={override} lite={tab.lite} tabId={tab.id} />
    </div>
  );
}
