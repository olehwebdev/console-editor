import type { ComponentType } from 'react';
import type { RuleInputOf } from '@common/rules';
import type { CreateRuleInput, HeaderEdit, RuleAction, RuleResourceType } from '@common/types';
import type { RulePageDraft } from '@/entities/editor-tab';

export interface RuleFormProps {
  /** The input as saved (a rule's) or as seeded (a new rule's): what edits are made to. */
  saved: CreateRuleInput;
  /** Unapplied edits, kept by the page; ignored once `saved` is no longer what they were made to. */
  draft?: RulePageDraft;
  onDraft(next: RulePageDraft): void;
  onSubmit(): void;
  submitLabel: string;
  /** Shown instead of Revert (a new rule's page). */
  onCancel?(): void;
  /** Focus the pattern on mount. */
  autoFocus?: boolean;
}

/** What each action's own fields take: its input, and the header rows' keys. */
export interface RuleActionFieldsProps<A extends RuleAction> {
  value: RuleInputOf<A>;
  rowKeys: string[];
  onChange(next: RuleInputOf<A>, rowKeys: string[]): void;
}

/** One component per action for its own fields: a new action fails typecheck until it has one. */
export type RuleActionFields = { [A in RuleAction]: ComponentType<RuleActionFieldsProps<A>> };

export interface ResourceTypePickerProps {
  /** Empty: every type. */
  value: RuleResourceType[];
  onChange(next: RuleResourceType[]): void;
}

export interface HeaderEditRowProps {
  edit: HeaderEdit;
  /** The id of the datalist of common header names. */
  listId: string;
  /** The row was just added: its name field takes focus. */
  autoFocus: boolean;
  onChange(next: HeaderEdit): void;
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
