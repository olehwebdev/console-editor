import { useId } from 'react';
import { useFieldArray, useFormState, useWatch } from 'react-hook-form';
import { MAX_HEADER_EDITS } from '@common/rules';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { FieldError } from '@/shared/ui/field-error';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import { BLANK_HEADER_EDIT, HEADER_PRESETS, HeaderNameList } from '@/entities/rule';
import { FormSection } from './FormSection';
import { RuleHeaderRow } from './RuleHeaderRow';
import type { RuleActionFieldsProps } from './types';
import { withPreset } from './withPreset';

/** A header rule's changes, in order: one row each, "Add header" and the presets. A row added takes focus. */
export function HeaderEditsField({ control }: RuleActionFieldsProps) {
  const listId = useId();
  const errorId = useId();
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'headers' });
  const headers = useWatch({ control, name: 'headers' });
  const formState = useFormState({ control, name: 'headers' });
  // The list's own problem (no change, or too many), apart from its rows'.
  const listState = control.getFieldState('headers', formState).error;
  const listError = listState?.root?.message ?? listState?.message;

  return (
    <FormSection title="Header changes" hint="Applied in order to each matching response; a newer rule's change wins over an older one's.">
      <HeaderNameList id={listId} />
      {fields.length ? (
        <div className="flex flex-col gap-1.5">
          {fields.map((field, index) => (
            <RuleHeaderRow key={field.id} control={control} index={index} listId={listId} onRemove={() => remove(index)} />
          ))}
        </div>
      ) : null}
      <FieldError id={errorId} message={listError} data-testid="header-error" />
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          leading={<Icon icon={icons.AddIcon} size={BUTTON_ICON_SIZE.sm} />}
          disabled={fields.length >= MAX_HEADER_EDITS}
          onClick={() => append({ ...BLANK_HEADER_EDIT })}
          aria-describedby={listError ? errorId : undefined}
          data-testid="header-add"
        >
          Add header
        </Button>
        <Menu label="Header presets" items={HEADER_PRESETS.map((preset) => ({ label: preset.label, onSelect: () => replace(withPreset(headers ?? [], preset)) }))}>
          <Button size="sm" variant="ghost" trailing={<Icon icon={icons.ChevronDownIcon} size={BUTTON_ICON_SIZE.sm} />} data-testid="header-presets">
            Presets
          </Button>
        </Menu>
      </div>
    </FormSection>
  );
}
