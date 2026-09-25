import { cn, type JsonTreeRow } from '@/shared/lib';
import { InlineEdit } from './InlineEdit';
import type { TreeActions } from './types';

/** A member's key (double-click to rename it) or an item's index. */
export function KeyLabel({ row, editing, actions }: { row: JsonTreeRow; editing: boolean; actions: TreeActions }) {
  const { key } = row;
  if (editing) return <InlineEdit initial={String(key)} label="Key" check={() => null} onCommit={(typed) => actions.commit(row, 'key', typed)} onCancel={actions.cancelEdit} className="max-w-48 flex-none" />;
  const named = typeof key === 'string';
  return (
    <span className={cn('shrink-0', named ? 'text-info' : 'text-fg-subtle')} onDoubleClick={() => named && actions.startEdit(row, 'key')} data-testid="tree-key">
      {key}
      <span className="text-fg-subtle">:</span>
    </span>
  );
}
