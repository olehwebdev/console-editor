import { UnfoldLessIcon } from '@hugeicons/core-free-icons';
import { useMemo, useState } from 'react';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Section } from '@/shared/ui/section';
import { Tree } from '@/shared/ui/tree';
import { Block } from '../../Block';
import { FILES, ICON_SIZE, INITIAL_EXPANDED_FOLDERS, INITIAL_SELECTED_FILE } from './constants';
import { countFiles } from './countFiles';
import { FileTreeRow } from './FileTreeRow';
import { flatten } from './flatten';

const { ReloadIcon, SearchIcon } = icons;

export function FileTreeBlock() {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(INITIAL_EXPANDED_FOLDERS));
  const [selected, setSelected] = useState(INITIAL_SELECTED_FILE);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => flatten(FILES, expanded, q), [expanded, q]);

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Block title="Tree · HoverHighlight · Section" hint="hover glides one pill; ↑↓←→ Home End Enter; type to filter">
      <div className="w-[300px] rounded-lg border border-line bg-surface py-1.5">
        <div className="px-2 pb-2">
          <Input
            size="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files"
            aria-label="Filter files"
            leading={<Icon icon={SearchIcon} size={ICON_SIZE} className="text-fg-subtle" />}
          />
        </div>
        <Section
          title="Page resources"
          count={countFiles({ id: '', name: '', children: FILES })}
          actions={
            <>
              <IconButton icon={ReloadIcon} label="Reload resources" size="sm" />
              <IconButton icon={UnfoldLessIcon} label="Collapse all" size="sm" onClick={() => setExpanded(new Set())} />
            </>
          }
        >
          {rows.length ? (
            <Tree label="Page resources" className="px-1.5">
              {rows.map((row) => (
                <FileTreeRow key={row.node.id} row={row} selected={selected} query={q} onToggle={toggle} onSelect={setSelected} />
              ))}
            </Tree>
          ) : (
            <p className="px-4 py-3 text-[12px] text-fg-subtle">No files match “{query}”.</p>
          )}
        </Section>
      </div>
    </Block>
  );
}
