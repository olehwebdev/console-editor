import { useController } from 'react-hook-form';
import { HeaderEditRow } from '@/entities/rule';
import type { RuleHeaderRowProps } from './types';

/** One of a header rule's changes, on the rule's form: its fields, and what is wrong with them as they are typed. */
export function RuleHeaderRow({ control, index, listId, onRemove }: RuleHeaderRowProps) {
  // The name registers first: a row added, or the first one invalid on submit, focuses it.
  const name = useController({ control, name: `headers.${index}.name` });
  const operation = useController({ control, name: `headers.${index}.operation` });
  const value = useController({ control, name: `headers.${index}.value` });

  return (
    <HeaderEditRow
      edit={{ operation: operation.field.value, name: name.field.value, value: value.field.value }}
      listId={listId}
      errors={{ name: name.fieldState.error?.message, value: value.fieldState.error?.message }}
      nameRef={name.field.ref}
      valueRef={value.field.ref}
      // The row hands back the whole change: each field takes its own part, if it changed.
      onChange={(next) => {
        if (next.operation !== operation.field.value) operation.field.onChange(next.operation);
        if (next.name !== name.field.value) name.field.onChange(next.name);
        if (next.value !== value.field.value) value.field.onChange(next.value);
      }}
      onRemove={onRemove}
    />
  );
}
