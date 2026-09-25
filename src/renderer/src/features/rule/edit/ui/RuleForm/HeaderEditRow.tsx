import { useId } from 'react';
import { useController } from 'react-hook-form';
import { HEADER_OPERATIONS } from '@common/types';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { FieldError } from '@/shared/ui/field-error';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Menu } from '@/shared/ui/menu';
import { HEADER_OPERATION_FIELDS } from './constants';
import type { HeaderEditRowProps } from './types';

/**
 * One header change: the operation, the header's name and (for set) its value, with what is wrong
 * with it on a line of its own. Name and value share the room left (never below a usable width); in
 * a narrow editor the value wraps under the name.
 */
export function HeaderEditRow({ control, index, listId, onRemove }: HeaderEditRowProps) {
  const errorId = useId();
  // The name registers first: a row added, or the first one invalid on submit, focuses it.
  const name = useController({ control, name: `headers.${index}.name` });
  const operation = useController({ control, name: `headers.${index}.operation` });
  const value = useController({ control, name: `headers.${index}.value` });
  const { takesValue } = HEADER_OPERATION_FIELDS[operation.field.value];
  const nameError = name.fieldState.error?.message;
  const valueError = value.fieldState.error?.message;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Menu
        label="Header operation"
        items={HEADER_OPERATIONS.map((next) => ({
          label: HEADER_OPERATION_FIELDS[next].label,
          checked: next === operation.field.value,
          onSelect: () => {
            operation.field.onChange(next);
            // An operation without a value keeps none.
            if (!HEADER_OPERATION_FIELDS[next].takesValue) value.field.onChange('');
          },
        }))}
      >
        <Button size="sm" variant="secondary" trailing={<Icon icon={icons.ChevronDownIcon} size={BUTTON_ICON_SIZE.sm} />} data-testid="header-operation" className="w-[76px] justify-between">
          <span className="font-mono">{operation.field.value}</span>
        </Button>
      </Menu>
      <Input
        {...name.field}
        size="sm"
        mono
        list={listId}
        placeholder="Header-Name"
        aria-label="Header name"
        invalid={!!nameError}
        aria-describedby={nameError ? errorId : undefined}
        data-testid="header-name"
        className="min-w-24 flex-[3_1_12rem]"
      />
      <Input
        {...value.field}
        size="sm"
        mono
        disabled={!takesValue}
        placeholder={takesValue ? 'value' : ''}
        aria-label="Header value"
        invalid={!!valueError}
        aria-describedby={valueError && !nameError ? errorId : undefined}
        data-testid="header-value"
        className="min-w-24 flex-[4_1_10rem]"
      />
      <IconButton icon={icons.CloseIcon} label="Remove this change" size="sm" onClick={onRemove} />
      <FieldError id={errorId} message={nameError ?? valueError} className="basis-full" />
    </div>
  );
}
