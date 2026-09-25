import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import { hostOf, pathSegments } from '@/shared/lib';
import { Badge } from '@/shared/ui/badge';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import type { TabMeta } from '@/entities/editor-tab';
import { useHeldStore } from '@/entities/held-request';
import { formatTab } from '@/features/format-document';
import { HeldActions, HeldFields } from '@/features/network/held';
import { TreeViewToggle } from '@/features/network/response-tree';
import { Breadcrumbs } from '../Breadcrumbs';
import { HELD_BADGES } from './constants';

/** Over a request a breakpoint holds: where it goes, what it waits for, what to do with it, and what can be changed besides its body. */
export function HeldHeader({ tab, heldId }: { tab: TabMeta; heldId: string }) {
  const held = useHeldStore((s) => s.held.find((h) => h.id === heldId));
  return (
    <div className="shrink-0 border-b border-line bg-surface-editor" data-testid="held-header">
      {/* The actions wrap under the location when the editor is too narrow for both. */}
      <div className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5">
        <div className="flex min-w-0 flex-[1_1_220px] items-center gap-2">
          <Icon icon={icons.PauseIcon} size={15} className="shrink-0 text-warning" />
          <Breadcrumbs root={hostOf(tab.url)} segments={pathSegments(tab.url)} title={tab.url} />
          <Badge tone="warning" dot pulse={!!held}>
            {held ? HELD_BADGES[held.stage] : 'Let go'}
          </Badge>
          <IconButton icon={icons.PrettifyIcon} label="Pretty-print" shortcut={SHORTCUT.format} onClick={() => void formatTab(tab.id)} />
          <TreeViewToggle tabId={tab.id} />
        </div>
        {held ? <HeldActions tabId={tab.id} held={held} /> : null}
      </div>
      {held ? <HeldFields held={held} /> : null}
    </div>
  );
}
