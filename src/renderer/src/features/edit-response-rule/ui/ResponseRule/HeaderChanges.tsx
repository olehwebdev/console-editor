import { useId } from 'react';
import type { HeaderEdit } from '@common/types';
import { HeaderEditRow, HeaderNameList, isNewRowKey } from '@/entities/rule';

interface HeaderChangesProps {
  headers: HeaderEdit[];
  rowKeys: string[];
  onChange(headers: HeaderEdit[], rowKeys: string[]): void;
}

/** A response override's changes to the upstream headers, in order, one row each (as a header rule's). */
export function HeaderChanges({ headers, rowKeys, onChange }: HeaderChangesProps) {
  const listId = useId();
  return (
    <div className="flex flex-col gap-1.5" data-testid="response-headers">
      <HeaderNameList id={listId} />
      {headers.map((edit, i) => (
        <HeaderEditRow
          key={rowKeys[i]}
          edit={edit}
          listId={listId}
          autoFocus={isNewRowKey(rowKeys[i])}
          onChange={(next) => onChange(headers.with(i, next), rowKeys)}
          onRemove={() => onChange(headers.toSpliced(i, 1), rowKeys.toSpliced(i, 1))}
        />
      ))}
    </div>
  );
}
