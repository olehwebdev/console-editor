import { useShallow } from 'zustand/react/shallow';
import { api } from '@/shared/api';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Kbd } from '@/shared/ui/kbd';
import { Section } from '@/shared/ui/section';
import { selectOverrideList, useOverrideStore } from '@/entities/override';
import { useResourceFilter } from '@/features/filter-resources';
import { OverrideList } from './OverrideList';
import { ResourceTree, useResourceCount } from './ResourceTree';

/** Sidebar: filter, the user's overrides, and the files the page loaded. */
export function Explorer() {
  const query = useResourceFilter((s) => s.query);
  const setQuery = useResourceFilter((s) => s.setQuery);
  const overrideCount = useOverrideStore(useShallow((s) => selectOverrideList(s).length));
  const resourceCount = useResourceCount();

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="explorer">
      <header className="flex h-10 shrink-0 items-center justify-between pl-4 pr-2">
        <span className="label-caps">Explorer</span>
        <IconButton icon={icons.FolderIcon} label="Open the overrides folder" size="sm" onClick={() => void api.revealOverridesFolder()} />
      </header>
      <div className="px-3 pb-2">
        <Input
          size="sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter files and iframes"
          aria-label="Filter files"
          leading={<Icon icon={icons.SearchIcon} size={14} className="text-fg-subtle" />}
          trailing={
            query ? (
              <IconButton icon={icons.CloseIcon} label="Clear filter" size="sm" noTooltip onClick={() => setQuery('')} />
            ) : (
              <Kbd keys={['mod', 'K']} />
            )
          }
        />
      </div>
      <div className="flex min-h-0 max-h-[42%] shrink-0 flex-col overflow-y-auto">
        <Section title="Overrides" count={overrideCount} defaultOpen>
          <OverrideList />
        </Section>
      </div>
      <Section title="Page resources" count={resourceCount} defaultOpen className="flex min-h-0 flex-1 flex-col" contentClassName="min-h-0 flex-1">
        <ResourceTree />
      </Section>
    </div>
  );
}
