import { UnfoldLessIcon } from '@hugeicons/core-free-icons';
import { useMemo, useState } from 'react';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Section } from '@/shared/ui/section';
import { Tree, TreeLabel, TreeRow } from '@/shared/ui/tree';
import { Block } from '../../Block';
import { ICON_SIZE, KIND } from './constants';
import { countFiles } from './countFiles';
import { flatten } from './flatten';
import type { FileNode } from './types';

const { DiffIcon, FolderIcon, FolderOpenIcon, GlobeIcon, ReloadIcon, SearchIcon } = icons;

const FILES: FileNode[] = [
  {
    id: 'app',
    name: 'app.example.com',
    origin: true,
    children: [
      {
        id: 'app/static',
        name: 'static',
        children: [
          {
            id: 'app/static/js',
            name: 'js',
            children: [
              { id: 'app/static/js/main', name: 'main.3f9a1c.js', kind: 'js', live: true },
              { id: 'app/static/js/vendor', name: 'vendor.8812aa.chunk.js', kind: 'js' },
              { id: 'app/static/js/runtime', name: 'runtime-main.js', kind: 'js' },
            ],
          },
          {
            id: 'app/static/css',
            name: 'css',
            children: [
              { id: 'app/static/css/main', name: 'main.c0ffee.css', kind: 'css', live: true },
              { id: 'app/static/css/theme', name: 'theme.css', kind: 'css' },
            ],
          },
        ],
      },
      { id: 'app/index', name: '(index)', kind: 'html' },
    ],
  },
  {
    id: 'cdn',
    name: 'cdn.jsdelivr.net',
    origin: true,
    children: [
      {
        id: 'cdn/npm',
        name: 'npm/react-dom@19',
        children: [{ id: 'cdn/npm/react-dom', name: 'react-dom.production.min.js', kind: 'js' }],
      },
    ],
  },
];

/** Open at first: the folders down to the selected file. */
const INITIAL_EXPANDED = ['app', 'app/static', 'app/static/js'];
const INITIAL_SELECTED = 'app/static/js/main';

export function FileTreeBlock() {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(INITIAL_EXPANDED));
  const [selected, setSelected] = useState(INITIAL_SELECTED);
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
              {rows.map(({ node, depth, expanded: open, count }) => {
                const file = !node.children;
                const kind = node.kind ? KIND[node.kind] : null;
                return (
                  <TreeRow
                    key={node.id}
                    depth={depth}
                    expanded={open}
                    onToggle={file ? undefined : () => toggle(node.id)}
                    selected={file && node.id === selected}
                    icon={node.origin ? GlobeIcon : kind ? kind.glyph : open ? FolderOpenIcon : FolderIcon}
                    iconClassName={node.origin ? 'text-info' : kind ? kind.tint : 'text-fg-subtle'}
                    label={
                      file ? (
                        <TreeLabel text={node.name} highlight={q} className={node.live ? 'text-live' : undefined} />
                      ) : (
                        <span className={node.origin ? 'font-medium text-fg' : undefined}>{node.name}</span>
                      )
                    }
                    meta={file ? undefined : count}
                    title={node.name}
                    onClick={file ? () => setSelected(node.id) : undefined}
                    trailing={
                      file ? (
                        <span className="flex items-center gap-1">
                          <IconButton
                            icon={DiffIcon}
                            label="Compare"
                            size="sm"
                            noTooltip
                            tabIndex={-1}
                            className="size-5 opacity-0 transition-opacity group-hover/tree-row:opacity-100"
                          />
                          {node.live ? (
                            <span aria-label="Served from your override" role="img" className="size-1.5 rounded-full bg-live shadow-[0_0_8px_var(--live)]" />
                          ) : null}
                        </span>
                      ) : undefined
                    }
                  />
                );
              })}
            </Tree>
          ) : (
            <p className="px-4 py-3 text-[12px] text-fg-subtle">No files match “{query}”.</p>
          )}
        </Section>
      </div>
    </Block>
  );
}
