import { join } from 'node:path';
import type { ConsoleAction } from '../../../shared/types';
import { parseInput } from '../parseInput';
import { WriteQueue } from '../WriteQueue';
import { actionPatchSchema } from './actionPatchSchema';
import { ACTIONS_FILE, MAX_ACTIONS } from './constants';
import { newAction } from './newAction';
import { newActionSchema } from './newActionSchema';
import { readActions } from './readActions';
import { toAction } from './toAction';
import type { StoredAction } from './types';
import { writeActions } from './writeActions';

/**
 * Actions: code kept to run in a frame of the page with one click.
 *
 *   <dir>/actions.json   every workspace's actions, in the order they were made
 *
 * Each action belongs to a workspace. `list` covers the active one's, and
 * `create` adds to it; `update` and `remove` reach any, so a change still in
 * flight when the workspace changes lands where it began. Changes run one at a
 * time on a copy that becomes current only once it is written: a failed write
 * never leaves a half-applied change.
 */
export class ActionStore {
  private workspaceId = '';
  private current: StoredAction[] = [];
  private readonly writes = new WriteQueue();
  private readonly path: string;

  constructor(dir: string) {
    this.path = join(dir, ACTIONS_FILE);
  }

  async load(): Promise<void> {
    this.current = await readActions(this.path);
  }

  /** The workspace whose actions `list` returns, and `create` adds to. */
  setWorkspace(id: string): void {
    this.workspaceId = id;
  }

  /** The active workspace's actions, oldest first. */
  list(): ConsoleAction[] {
    return this.current.filter((a) => a.workspaceId === this.workspaceId).map(toAction);
  }

  async create(input: unknown): Promise<ConsoleAction> {
    const fields = parseInput(newActionSchema, input, 'action');
    // The workspace active when it was asked for, even if another becomes active before it is written.
    const { workspaceId } = this;
    return this.mutate((actions) => {
      if (actions.filter((a) => a.workspaceId === workspaceId).length >= MAX_ACTIONS) throw new Error(`A workspace keeps at most ${MAX_ACTIONS} actions`);
      const action = newAction(fields, workspaceId, actions);
      actions.push(action);
      return toAction(action);
    });
  }

  async update(id: unknown, patch: unknown): Promise<ConsoleAction> {
    const fields = parseInput(actionPatchSchema, patch, 'action');
    return this.mutate((actions) => {
      // Found in the latest state, so queued updates don't undo each other.
      const index = actions.findIndex((a) => a.id === id);
      if (index < 0) throw new Error('That action no longer exists');
      const next = { ...actions[index]!, ...fields, updatedAt: Date.now() };
      actions[index] = next;
      return toAction(next);
    });
  }

  remove(id: unknown): Promise<void> {
    return this.mutate((actions) => {
      const index = actions.findIndex((a) => a.id === id);
      if (index < 0) throw new Error('That action no longer exists');
      actions.splice(index, 1);
    });
  }

  /** Deletes every action of a workspace. */
  async removeWorkspace(workspaceId: string): Promise<void> {
    if (!this.current.some((a) => a.workspaceId === workspaceId)) return;
    await this.mutate((actions) => {
      actions.splice(0, actions.length, ...actions.filter((a) => a.workspaceId !== workspaceId));
    });
  }

  /** Applies `change` to a copy of every action, writes it, and only then makes it current. Runs one at a time. */
  private mutate<T>(change: (actions: StoredAction[]) => T): Promise<T> {
    return this.writes.run(async () => {
      const next = [...this.current];
      const result = change(next);
      await writeActions(this.path, next);
      this.current = next;
      return result;
    });
  }
}
