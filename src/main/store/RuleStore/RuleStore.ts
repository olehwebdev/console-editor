import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { compareRuleAge, validateRuleInput } from '../../../shared/rules';
import type { CreateRuleInput, Rule, RulePatch } from '../../../shared/types';
import { isRecord } from '../isRecord';
import { sanitizeRuleInput } from '../sanitizeRuleInput';
import { sanitizeRulePatch } from '../sanitizeRulePatch';
import { toRule } from '../toRule';
import type { RuleState, StoredRule } from '../types';
import { WriteQueue } from '../WriteQueue';
import { writeAtomic } from '../writeAtomic';
import { addRule } from './addRule';
import { INDEX_FILE, INDEX_VERSION } from './constants';
import { patchRule } from './patchRule';
import { readRuleIndex } from './readRuleIndex';
import type { IndexFile } from './types';

/**
 * Persists the rules of every workspace in one file, next to overrides.json:
 *
 *   <dir>/rules.json   { version, rules: [{ workspaceId, id, action, match, resourceTypes, headers?, enabled, createdAt, updatedAt }] }
 *
 * Entries this build can't read (a newer build's action or request type, a
 * hand edit) are never listed or applied, and are written back verbatim, last.
 * A file it can't use is kept and the store starts empty (see `readRuleIndex`):
 * moved aside to rules.json.broken (`setAside`), or, when it can't be read or
 * moved, left as it is with every change refused (`locked`).
 *
 * Changes run one at a time and reach memory (and so the engine) only once
 * they are on disk. `list` (what the engine applies) and `forRenderer` cover
 * the active workspace, oldest first; `get`, `update` and `remove` reach any,
 * so an edit in flight when the workspace changes lands where it began.
 */
export class RuleStore {
  private state: RuleState = { rules: new Map(), foreign: [] };
  private readonly writes = new WriteQueue();
  private workspaceId = '';
  /** The active workspace's rules, oldest first: rebuilt on every change, so `list()` allocates nothing. */
  private active: StoredRule[] = [];
  /** Where an unreadable rules.json was moved at load, if it was. */
  setAside: string | undefined;
  /** Why changes are refused: rules.json couldn't be read or moved aside, and is left untouched. */
  locked: string | undefined;

  constructor(readonly dir: string) {}

  private get indexPath(): string {
    return join(this.dir, INDEX_FILE);
  }

  async load(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const { setAside, locked, ...state } = await readRuleIndex(this.indexPath);
    this.state = state;
    this.setAside = setAside;
    this.locked = locked;
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
    const rule = this.state.rules.get(id);
    if (!rule) throw new Error(`Unknown rule ${id}`);
    return rule;
  }

  /** Adds an enabled rule to the workspace active when this is called, even if another is by the time it is written. */
  async create(input: CreateRuleInput): Promise<StoredRule> {
    const clean = sanitizeRuleInput(input);
    const error = validateRuleInput(clean);
    if (error) throw new Error(error);
    const { workspaceId } = this;
    return this.mutate((state) => addRule(state, workspaceId, clean));
  }

  /** Edits a rule of any workspace, on top of the latest committed state (queued edits don't undo each other). */
  async update(id: string, patch: RulePatch): Promise<StoredRule> {
    const clean = sanitizeRulePatch(patch);
    return this.mutate((state) => patchRule(state, id, clean));
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
    if ([...this.state.rules.values()].every((r) => known.has(r.workspaceId))) return;
    await this.mutate((state) => {
      for (const [id, rule] of state.rules) if (!known.has(rule.workspaceId)) state.rules.set(id, { ...rule, workspaceId: fallback });
    });
  }

  private rebuild(): void {
    this.active = [...this.state.rules.values()].filter((r) => r.workspaceId === this.workspaceId).sort(compareRuleAge);
  }

  /**
   * Applies `change` to a copy of the state, writes the index, and only then
   * makes the copy current. Runs one at a time; a failed change or write
   * leaves memory as it was.
   */
  private mutate<T>(change: (state: RuleState) => T): Promise<T> {
    // Writing would replace a file that couldn't be read.
    if (this.locked) return Promise.reject(new Error(this.locked));
    return this.writes.run(async () => {
      const next: RuleState = { rules: new Map(this.state.rules), foreign: [...this.state.foreign] };
      const result = change(next);
      const index: IndexFile = { version: INDEX_VERSION, rules: [...next.rules.values(), ...next.foreign] };
      await writeAtomic(this.indexPath, `${JSON.stringify(index, null, 2)}\n`);
      this.state = next;
      this.rebuild();
      return result;
    });
  }
}
