import { useId } from 'react';
import type { HeaderEdit } from '@common/types';
import { isNewRowKey } from '../lib/isNewRowKey';
import { HeaderEditRow } from './HeaderEditRow';
import { HeaderNameList } from './HeaderNameList';

interface HeaderEditListProps {
  headers: HeaderEdit[];
  rowKeys: string[];
  onChange(headers: HeaderEdit[], rowKeys: string[]): void;
  testId?: string;
}

/** Header changes in order, one row each (as a header rule's), with the common header names offered. */
export function HeaderEditList({ headers, rowKeys, onChange, testId }: HeaderEditListProps) {
  const listId = useId();
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
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
