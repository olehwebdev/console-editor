import type { ComponentType } from 'react';
import type { Control } from 'react-hook-form';
import type { CreateRuleInput, RuleAction, RuleResourceType } from '@common/types';
import type { RuleFormControl } from '../../model/types';

export interface RuleFormProps {
  /** The rule page whose form this shows (its edits live there, not in this component). */
  pageId: string;
  /** Apply or create: the page checks the form and sends it. */
  onSubmit(): void;
  submitLabel: string;
  /** Shown instead of Revert (a new rule's page). */
  onCancel?(): void;
  /** Focus the pattern on mount. */
  autoFocus?: boolean;
}

export interface RuleFormFieldsProps extends Omit<RuleFormProps, 'pageId'> {
  form: RuleFormControl;
}

/** What each action's own fields take: the rule's form. */
export interface RuleActionFieldsProps {
  control: Control<CreateRuleInput, unknown, CreateRuleInput>;
}

/** One component per action for its own fields: a new action fails typecheck until it has one. */
export type RuleActionFields = Record<RuleAction, ComponentType<RuleActionFieldsProps>>;

export interface ResourceTypePickerProps {
  /** Empty: every type. */
  value: RuleResourceType[];
  onChange(next: RuleResourceType[]): void;
}

export interface HeaderEditRowProps extends RuleActionFieldsProps {
  /** The row's place in the header changes. */
  index: number;
  /** The id of the datalist of common header names. */
  listId: string;
  onRemove(): void;
}

/** What a header operation shows in the editor. */
export interface HeaderOperationField {
  label: string;
  /** Whether it takes a value (the value field is disabled, and emptied, otherwise). */
  takesValue: boolean;
}

/** A note shown under the form when it applies to what is being written. */
export interface RuleNoteCheck {
  id: string;
  applies(value: CreateRuleInput, pageUrl: string): boolean;
  text: string;
}
