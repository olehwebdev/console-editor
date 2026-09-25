import { icons } from '@/shared/config';
import { cn, countChildren, type JsonTreeRow } from '@/shared/lib';
import { IconButton } from '@/shared/ui/icon-button';
import type { TreeActions } from './types';

/** A row's actions, shown on hover and on the selected row: add or empty for an object or array, edit or null a value, remove any but the root. */
export function RowActions({ row, actions, shown }: { row: JsonTreeRow; actions: TreeActions; shown: boolean }) {
  const { node } = row;
  const container = node.kind === 'object' || node.kind === 'array';
  const count = countChildren(node);
  const act = (run: () => void) => (event: { stopPropagation(): void }) => {
    event.stopPropagation();
    run();
  };
  return (
    <span className={cn('ml-auto flex shrink-0 items-center', shown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
      {container ? <IconButton icon={icons.AddIcon} label={node.kind === 'object' ? 'Add a member' : 'Add an item'} size="sm" onClick={act(() => actions.add(row))} /> : null}
      {container && count ? <IconButton icon={icons.ClearValueIcon} label="Empty it" size="sm" onClick={act(() => actions.empty(row))} /> : null}
      {!container ? <IconButton icon={icons.EditIcon} label="Edit the value" size="sm" onClick={act(() => actions.startEdit(row, 'value'))} /> : null}
      {!container && node.kind !== 'null' ? <IconButton icon={icons.ClearValueIcon} label="Set it to null" size="sm" onClick={act(() => actions.setNull(row))} /> : null}
      {row.parent ? <IconButton icon={icons.DeleteIcon} label="Remove it" size="sm" onClick={act(() => actions.remove(row))} /> : null}
    </span>
  );
}
