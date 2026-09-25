import type { InspectFramework } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { linkName, useInspectorStore, useTreeStore, type TreeRow } from '@/entities/inspector';
import { highlightNode, toggleNode } from '@/features/inspect/tree';
import { INDENT_PX, ROW_START_PX } from './constants';
import { nameLevels } from './nameLevels';
import { openTreeNodeAt } from './openTreeNodeAt';

/**
 * A component of the tree: pressing it opens it on the Component page, its chevron opens what it renders;
 * hovering highlights it in the page. `fresh`: it rendered in its frame's last recorded commit.
 */
export function TreeRowView({ row, fresh }: { row: Extract<TreeRow, { kind: 'node' }>; fresh: boolean }) {
  const origins = useInspectorStore((s) => s.origins);
  const open = useTreeStore((s) => !!s.expanded[row.key]);
  const selected = useTreeStore((s) => s.selected === row.key);
  const framework: InspectFramework = row.node.framework;
  return (
    <div
      role="treeitem"
      aria-expanded={row.node.children ? open : undefined}
      aria-selected={selected}
      className={cn('group flex h-7 min-w-0 items-center rounded-md pr-2 text-[13px] hover:bg-hover', selected && 'bg-accent/12 text-fg')}
      style={{ paddingLeft: ROW_START_PX + row.depth * INDENT_PX }}
      onPointerEnter={() => highlightNode(row.path)}
      onPointerLeave={() => highlightNode(null)}
      data-testid="tree-row"
      data-path={row.key}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? 'Close' : 'Open'}
        disabled={!row.node.children}
        onClick={() => void toggleNode(row.path).then(nameLevels)}
        className="flex size-5 shrink-0 items-center justify-center text-fg-subtle disabled:invisible"
        data-testid="tree-toggle"
      >
        <Icon icon={icons.ChevronRightIcon} size={12} className={cn('transition-transform duration-150', open && 'rotate-90')} />
      </button>
      <button type="button" onClick={() => void openTreeNodeAt(row.path)} className="flex h-full min-w-0 flex-1 items-center gap-2 text-left">
        <span className="min-w-0 truncate">{linkName(row.node, framework, origins)}</span>
        {row.node.key ? <span className="shrink-0 font-mono text-[11px] text-fg-subtle">key={row.node.key}</span> : null}
      </button>
      {fresh ? <span title="Rendered in the last commit" className="size-1.5 shrink-0 rounded-full bg-accent" data-testid="tree-fresh" /> : null}
    </div>
  );
}
