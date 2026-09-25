import type { RuleState } from '../types';

/** rules.json as written. */
export interface IndexFile {
  version: number;
  rules: unknown[];
}

/** What loading rules.json found: the rules and kept entries, and why changes are refused or where the file went, if so. */
export interface ReadRules extends RuleState {
  setAside?: string;
  locked?: string;
}
