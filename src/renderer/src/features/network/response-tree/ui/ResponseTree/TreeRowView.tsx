import { icons } from '@/shared/config';
import { cn, type JsonTreeRow } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { TREE_INDENT, VALUE_TONES } from '../../model';
import { InlineEdit } from './InlineEdit';
import { jsonProblem } from './jsonProblem';
import { KeyLabel } from './KeyLabel';
import { RowActions } from './RowActions';
import type { EditPart, TreeActions } from './types';
import { valueLabel } from './valueLabel';

export interface TreeRowViewProps {
  row: JsonTreeRow;
  /** The tab's text the row was read from. */
  text: string;
  index: number;
  selected: boolean;
  editing: EditPart | null;
  actions: TreeActions;
}

/** One value: its key or index, the value (or an object's or array's size), and what can be done with it; double-click edits. */
export function TreeRowView({ row, text, index, selected, editing, actions }: TreeRowViewProps) {
  const { node, key } = row;
  const container = node.kind === 'object' || node.kind === 'array';
  const source = text.slice(node.start, node.end);
  return (
    <div
      role="treeitem"
      id={`tree-row-${index}`}
      aria-level={row.depth + 1}
      aria-expanded={container ? row.open : undefined}
      aria-selected={selected}
      data-testid="tree-row"
      data-id={row.id}
      onClick={() => actions.select(row.id)}
      style={{ paddingLeft: row.depth * TREE_INDENT }}
      className={cn('group flex h-6 min-w-0 items-center gap-1 pr-1 font-mono text-[12px]', selected ? 'bg-accent/12' : 'hover:bg-hover')}
    >
      {container ? (
        <button type="button" tabIndex={-1} aria-label={row.open ? 'Close' : 'Open'} onClick={() => actions.toggle(row)} className="flex size-4 shrink-0 items-center justify-center text-fg-subtle">
          <Icon icon={icons.ChevronRightIcon} size={12} className={cn('transition-transform duration-150', row.open && 'rotate-90')} />
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      {key !== undefined ? <KeyLabel row={row} editing={editing === 'key'} actions={actions} /> : null}
      {editing === 'value' ? (
        <InlineEdit initial={source} label="Value, as JSON" check={jsonProblem} onCommit={(typed) => actions.commit(row, 'value', typed)} onCancel={actions.cancelEdit} select={node.kind === 'string' ? [1, source.length - 1] : undefined} />
      ) : (
        <span className={cn('min-w-0 truncate', VALUE_TONES[node.kind])} onDoubleClick={() => (container ? actions.toggle(row) : actions.startEdit(row, 'value'))} data-testid="tree-value">
          {valueLabel(row, text)}
        </span>
      )}
      {editing ? null : <RowActions row={row} actions={actions} shown={selected} />}
    </div>
  );
}
