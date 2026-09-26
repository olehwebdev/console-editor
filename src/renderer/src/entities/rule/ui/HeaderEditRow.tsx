import { useId } from 'react';
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
 * with it, if a form says, on a line of its own. Name and value share the room left (never below a
 * usable width); in a narrow editor the value wraps under the name.
 */
export function HeaderEditRow({ edit, listId, autoFocus, onChange, onRemove, errors, nameRef, valueRef }: HeaderEditRowProps) {
  const errorId = useId();
  const { takesValue } = HEADER_OPERATION_FIELDS[edit.operation];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Menu
        label="Header operation"
        items={HEADER_OPERATIONS.map((operation) => ({
          label: HEADER_OPERATION_FIELDS[operation].label,
          checked: operation === edit.operation,
          // An operation without a value keeps none.
          onSelect: () => onChange({ ...edit, operation, value: HEADER_OPERATION_FIELDS[operation].takesValue ? edit.value : '' }),
        }))}
      >
        <Button size="sm" variant="secondary" trailing={<Icon icon={icons.ChevronDownIcon} size={BUTTON_ICON_SIZE.sm} />} data-testid="header-operation" className="w-[76px] justify-between">
          <span className="font-mono">{edit.operation}</span>
        </Button>
      </Menu>
      <Input
        ref={nameRef}
        size="sm"
        mono
        value={edit.name}
        list={listId}
        autoFocus={autoFocus}
        placeholder="Header-Name"
        aria-label="Header name"
        invalid={!!errors?.name}
        aria-describedby={errors?.name ? errorId : undefined}
        data-testid="header-name"
        className="min-w-24 flex-[3_1_12rem]"
        onChange={(e) => onChange({ ...edit, name: e.target.value })}
      />
      <Input
        ref={valueRef}
        size="sm"
        mono
        value={edit.value}
        disabled={!takesValue}
        placeholder={takesValue ? 'value' : ''}
        aria-label="Header value"
        invalid={!!errors?.value}
        aria-describedby={errors?.value && !errors.name ? errorId : undefined}
        data-testid="header-value"
        className="min-w-24 flex-[4_1_10rem]"
        onChange={(e) => onChange({ ...edit, value: e.target.value })}
      />
      <IconButton icon={icons.CloseIcon} label="Remove this change" size="sm" onClick={onRemove} />
      <FieldError id={errorId} message={errors?.name ?? errors?.value} className="basis-full" />
    </div>
  );
}
