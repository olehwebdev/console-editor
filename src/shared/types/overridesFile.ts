import type { RequestMatch, ResponseSettings, UrlMatcher } from './overrides';
import type { ResourceKind } from './resources';
import type { CreateRuleInput } from './rules';

/**
 * An override as an export lists it (SPEC §5, Sharing): what recreates it, whether it was on, its
 * content, and the text editing started from when that differs.
 */
export interface ExportedOverride {
  kind: ResourceKind;
  sourceUrl: string;
  match: UrlMatcher;
  enabled: boolean;
  originalHash: string | null;
  /** Response overrides only. */
  request?: RequestMatch;
  /** Response overrides only. */
  response?: ResponseSettings;
  content: string;
  base?: string;
}

/** A rule as an export lists it: without its id and times, which the importing store sets. */
export type ExportedRule = CreateRuleInput & { enabled: boolean };

/** A workspace's overrides and rules, as one JSON file to import elsewhere (another workspace, a teammate's app). */
export interface OverridesFile {
  format: string;
  version: number;
  overrides: ExportedOverride[];
  rules: ExportedRule[];
}

/** An export as read: its entries are checked one by one when imported, so one that can't be read leaves out only itself. */
export type OverridesFileEntries = Omit<OverridesFile, 'overrides' | 'rules'> & { overrides: unknown[]; rules: unknown[] };

/** What exporting the active workspace's overrides and rules wrote. */
export interface OverridesExport {
  path: string;
  overrides: number;
  rules: number;
}

/** What importing an export of overrides and rules did to the active workspace. */
export interface OverridesImport {
  overrides: number;
  rules: number;
  /** Left out: the workspace already has an override answering the same requests, or a rule doing the same. */
  present: number;
  /** Left out: not an override or rule this version can read (a hand edit, a newer version's). */
  unreadable: number;
}
