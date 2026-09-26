import type { CreateOverrideInput, CreateRuleInput } from '../../shared/types';

/** An override as an export lists it: what recreates it, its content, and the text editing started from when that differs. */
export type ExportedOverride = Required<Pick<CreateOverrideInput, 'kind' | 'sourceUrl' | 'content' | 'originalHash' | 'match'>> &
  Pick<CreateOverrideInput, 'base' | 'request' | 'response'> & { enabled: boolean };

/** A rule as an export lists it. */
export type ExportedRule = CreateRuleInput & { enabled: boolean };

/** A workspace's overrides and rules, as one JSON file to import elsewhere (another workspace, a teammate's app). */
export interface OverridesFile {
  format: string;
  version: number;
  overrides: ExportedOverride[];
  rules: ExportedRule[];
}

/** An export file's entries, as found (each checked when imported). */
export interface OverridesFileEntries {
  overrides: unknown[];
  rules: unknown[];
}
