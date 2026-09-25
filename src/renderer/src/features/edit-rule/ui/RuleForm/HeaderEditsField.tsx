import { useId } from 'react';
import { MAX_HEADER_EDITS } from '@common/rules';
import type { HeaderEdit } from '@common/types';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import { HEADER_PRESETS } from '@/entities/rule';
import { isNewRowKey } from '../../model/isNewRowKey';
import { nextRowKey } from '../../model/nextRowKey';
import { BLANK_HEADER_EDIT, COMMON_HEADER_NAMES } from './constants';
import { FormSection } from './FormSection';
import { HeaderEditRow } from './HeaderEditRow';
import type { RuleActionFieldsProps } from './types';
import { withPreset } from './withPreset';

/** A header rule's changes, in order: one row each, "Add header" and the presets. */
export function HeaderEditsField({ value, rowKeys, onChange }: RuleActionFieldsProps<'headers'>) {
  const listId = useId();
  const setRows = (headers: HeaderEdit[], keys: string[]) => onChange({ ...value, headers }, keys);

  return (
    <FormSection title="Header changes" hint="Applied in order to each matching response; a newer rule's change wins over an older one's.">
      <datalist id={listId}>
        {COMMON_HEADER_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      {value.headers.length ? (
        <div className="flex flex-col gap-1.5">
          {value.headers.map((edit, i) => (
            <HeaderEditRow
              key={rowKeys[i]}
              edit={edit}
              listId={listId}
              autoFocus={isNewRowKey(rowKeys[i])}
              onChange={(next) => setRows(value.headers.with(i, next), rowKeys)}
              onRemove={() => setRows(value.headers.toSpliced(i, 1), rowKeys.toSpliced(i, 1))}
            />
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          leading={<Icon icon={icons.AddIcon} size={BUTTON_ICON_SIZE.sm} />}
          disabled={value.headers.length >= MAX_HEADER_EDITS}
          onClick={() => setRows([...value.headers, { ...BLANK_HEADER_EDIT }], [...rowKeys, nextRowKey()])}
          data-testid="header-add"
        >
          Add header
        </Button>
        <Menu
          label="Header presets"
          items={HEADER_PRESETS.map((preset) => ({
            label: preset.label,
            onSelect: () => {
              const next = withPreset(value.headers, rowKeys, preset);
              setRows(next.headers, next.rowKeys);
            },
          }))}
        >
          <Button size="sm" variant="ghost" trailing={<Icon icon={icons.ChevronDownIcon} size={BUTTON_ICON_SIZE.sm} />} data-testid="header-presets">
            Presets
          </Button>
        </Menu>
      </div>
    </FormSection>
  );
}
