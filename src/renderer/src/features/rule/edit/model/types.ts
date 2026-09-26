import type { createFormControl } from 'react-hook-form';
import type { RuleInputOf } from '@common/rules';
import type { CreateRuleInput, RuleAction } from '@common/types';

/** Per action, a new rule's starting point: for a URL (a file row), or from scratch. */
export type RuleSeeds = { [A in RuleAction]: (url?: string) => RuleInputOf<A> };

/** A rule page's form, made outside React: it holds the page's edits while other tabs are in front. */
export type RuleFormControl = ReturnType<typeof createFormControl<CreateRuleInput, unknown, CreateRuleInput>>;

/** An open rule page's form, and what it knows of the page's rule. */
export interface RuleFormEntry {
  form: RuleFormControl;
  /** The rule as saved (as seeded, for a new rule): what the edits are made to. */
  base: CreateRuleInput;
  /** Stops marking the tab as holding edits. */
  stop(): void;
}
