import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { compareRuleAge, MAX_RULES, validateRuleInput } from '../../shared/rules';
import type { CreateRuleInput, Rule, RulePatch } from '../../shared/types';
import { FILE_NOT_FOUND } from '../constants';
import { RULE_ID_BYTES } from './constants';
import { isRecord } from './isRecord';
import { sanitizeRuleInput } from './sanitizeRuleInput';
import { sanitizeRulePatch } from './sanitizeRulePatch';
import { sanitizeStoredRule } from './sanitizeStoredRule';
import { toRule } from './toRule';
import type { RuleState, StoredRule } from './types';
import { writeAtomic } from './writeAtomic';

const INDEX_FILE = 'rules.json';
/** Written, never branched on: older builds never open this file. */
const INDEX_VERSION = 1;
/** Where an unreadable rules.json is kept: `rules.json.broken`. */
const BROKEN_SUFFIX = '.broken';

interface IndexFile {
  version: number;
  rules: unknown[];
}

/**
 * Persists the rules of every workspace in one file, next to overrides.json:
 *
 *   <dir>/rules.json   { version, rules: [{ workspaceId, id, action, match, resourceTypes, headers?, enabled, createdAt, updatedAt }] }
 *
 * Entries this build can't read (a newer build's action or request type, a
 * hand edit) are never listed or applied, and are written back verbatim, last.
 * A file that isn't JSON of that shape is moved aside to rules.json.broken
 * (`setAside`) and the store starts empty: a secondary file never leaves the
 * app without a window, and the user's file is kept.
 *
 * Changes run one at a time and reach memory (and so the engine) only once
 * they are on disk. `list` (what the engine applies) and `forRenderer` cover
 * the active workspace, oldest first; `get`, `update` and `remove` reach any,
 * so an edit in flight when the workspace changes lands where it began.
 */
export class RuleStore {
  private rules = new Map<string, StoredRule>();
  /** Entries this build can't read, kept verbatim. */
  private foreign: unknown[] = [];
  private writes: Promise<void> = Promise.resolve();
  private workspaceId = '';
  /** The active workspace's rules, oldest first: rebuilt on every change, so `list()` allocates nothing. */
  private active: StoredRule[] = [];
  /** Where an unreadable rules.json was moved at load, if it was. */
  setAside: string | undefined;

  constructor(readonly dir: string) {}

  private get indexPath(): string {
    return join(this.dir, INDEX_FILE);
  }

  async load(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    let text: string;
    try {
      text = await readFile(this.indexPath, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === FILE_NOT_FOUND) return;
      throw new Error(`Could not read ${this.indexPath}: ${(err as Error).message}`);
    }
    const entries = this.parse(text);
    if (!entries) {
      await this.setAsideIndex();
      return;
    }
    const rules = new Map<string, StoredRule>();
    const foreign: unknown[] = [];
    for (const entry of entries) {
      const rule = sanitizeStoredRule(entry);
      // A duplicate id is kept like any entry this build can't use.
      if (rule && !rules.has(rule.id)) rules.set(rule.id, rule);
      else foreign.push(entry);
    }
    this.rules = rules;
    this.foreign = foreign;
    this.rebuild();
  }

  /** The workspace whose rules `list` and `forRenderer` return, and `create` adds to. */
  setWorkspace(id: string): void {
    this.workspaceId = id;
    this.rebuild();
  }

  /** The active workspace's rules, oldest first: the engine's getter (the same array until something changes). */
  list(): readonly StoredRule[] {
    return this.active;
  }

  forRenderer(): Rule[] {
    return this.active.map(toRule);
  }

  /** A rule of any workspace. */
  get(id: string): StoredRule {
    const rule = this.rules.get(id);
    if (!rule) throw new Error(`Unknown rule ${id}`);
    return rule;
  }

  /** Adds an enabled rule to the workspace active when this is called, even if another is by the time it is written. */
  async create(input: CreateRuleInput): Promise<StoredRule> {
    const clean = sanitizeRuleInput(input);
    const error = validateRuleInput(clean);
    if (error) throw new Error(error);
    const { workspaceId } = this;
    return this.mutate((state) => {
      if ([...state.rules.values()].filter((r) => r.workspaceId === workspaceId).length >= MAX_RULES) {
        throw new Error(`A workspace holds at most ${MAX_RULES} rules`);
      }
      const taken = new Set(state.foreign.map((entry) => (isRecord(entry) ? entry.id : undefined)));
      let id: string;
      do id = randomBytes(RULE_ID_BYTES).toString('hex');
      while (state.rules.has(id) || taken.has(id));
      const now = Date.now();
      const rule: StoredRule = { workspaceId, id, ...clean, enabled: true, createdAt: now, updatedAt: now };
      state.rules.set(id, rule);
      return rule;
    });
  }

  /** Edits a rule of any workspace, on top of the latest committed state (queued edits don't undo each other). */
  async update(id: string, patch: RulePatch): Promise<StoredRule> {
    const clean = sanitizeRulePatch(patch);
    return this.mutate((state) => {
      const current = state.rules.get(id);
      if (!current) throw new Error(`Unknown rule ${id}`);
      if (clean.headers !== undefined && current.action !== 'headers') throw new Error('Only header rules have headers');
      // The patch holds only fields `current`'s action has (checked above), so the merge stays that member.
      const next = { ...current, ...clean, updatedAt: Date.now() } as StoredRule;
      const error = validateRuleInput(next);
      if (error) throw new Error(error);
      state.rules.set(id, next);
      return next;
    });
  }

  async remove(id: string): Promise<void> {
    await this.mutate((state) => {
      if (!state.rules.delete(id)) throw new Error(`Unknown rule ${id}`);
    });
  }

  /**
   * Deletes every rule of a workspace, those this build can't read included.
   * Decided on the latest state, so a create queued before it is caught too.
   */
  async removeWorkspace(workspaceId: string): Promise<void> {
    await this.mutate((state) => {
      for (const [id, rule] of state.rules) if (rule.workspaceId === workspaceId) state.rules.delete(id);
      state.foreign = state.foreign.filter((entry) => !isRecord(entry) || entry.workspaceId !== workspaceId);
    });
  }

  /**
   * Gives the rules of no workspace in `known` (whose workspace was lost) to
   * `fallback`, so none is left where nothing applies or shows it. Entries this
   * build can't read are left as they are.
   */
  async adopt(known: ReadonlySet<string>, fallback: string): Promise<void> {
    if ([...this.rules.values()].every((r) => known.has(r.workspaceId))) return;
    await this.mutate((state) => {
      for (const [id, rule] of state.rules) if (!known.has(rule.workspaceId)) state.rules.set(id, { ...rule, workspaceId: fallback });
    });
  }

  /** The entries of a rules.json, or null when it isn't JSON of the shape `{ rules: [...] }`. */
  private parse(text: string): unknown[] | null {
    try {
      const index: unknown = JSON.parse(text);
      return isRecord(index) && Array.isArray(index.rules) ? index.rules : null;
    } catch {
      return null;
    }
  }

  /** Moves an unreadable rules.json aside (replacing an older one), so it is kept and the store can start empty. */
  private async setAsideIndex(): Promise<void> {
    const broken = `${this.indexPath}${BROKEN_SUFFIX}`;
    try {
      await rename(this.indexPath, broken);
      this.setAside = broken;
      console.warn(`${this.indexPath} could not be read; it was kept as ${broken} and the app starts with no rules`);
    } catch (err) {
      console.warn(`${this.indexPath} could not be read or moved aside; the app starts with no rules`, err);
    }
  }

  private rebuild(): void {
    this.active = [...this.rules.values()].filter((r) => r.workspaceId === this.workspaceId).sort(compareRuleAge);
  }

  /**
   * Applies `change` to a copy of the state, writes the index, and only then
   * makes the copy current. Runs one at a time; a failed change or write
   * leaves memory as it was.
   */
  private mutate<T>(change: (state: RuleState) => T): Promise<T> {
    const run = this.writes.then(async () => {
      const next: RuleState = { rules: new Map(this.rules), foreign: [...this.foreign] };
      const result = change(next);
      const index: IndexFile = { version: INDEX_VERSION, rules: [...next.rules.values(), ...next.foreign] };
      await writeAtomic(this.indexPath, `${JSON.stringify(index, null, 2)}\n`);
      this.rules = next.rules;
      this.foreign = next.foreign;
      this.rebuild();
      return result;
    });
    this.writes = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
