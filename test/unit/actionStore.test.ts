import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionStore } from '../../src/main/store/ActionStore';
import * as atomic from '../../src/main/store/writeAtomic';
import { MAX_ACTION_CODE, MAX_ACTION_NAME } from '../../src/shared/constants';
import type { ActionInput } from '../../src/shared/types';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'console-editor-actions-'));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

const WS_A = 'aaaaaaaa';
const WS_B = 'bbbbbbbb';

async function fresh(workspaceId = WS_A): Promise<ActionStore> {
  const store = new ActionStore(dir);
  await store.load();
  store.setWorkspace(workspaceId);
  return store;
}

const input = (extra: Partial<ActionInput> = {}): ActionInput => ({ name: 'Add item', target: 'name:cart', targetName: 'cart', code: "addItem('A1')", ...extra });

describe('ActionStore', () => {
  it("keeps each workspace's actions, oldest first, across instances", async () => {
    const a = await fresh();
    const first = await a.create(input());
    const second = await a.create(input({ name: 'Checkout', target: 'top', targetName: '', code: 'await checkout()' }));
    a.setWorkspace(WS_B);
    const other = await a.create(input({ name: 'Other site' }));
    expect(a.list()).toEqual([other]);

    const b = await fresh();
    expect(b.list()).toEqual([first, second]);
    expect(first).toMatchObject({ name: 'Add item', target: 'name:cart', targetName: 'cart', code: "addItem('A1')" });
    expect(first.id).toMatch(/^[0-9a-f]{8}$/);
    expect(first).not.toHaveProperty('workspaceId');
    const file = JSON.parse(await readFile(join(dir, 'actions.json'), 'utf8'));
    expect(file.version).toBe(1);
    expect(file.actions.map((x: { workspaceId: string }) => x.workspaceId)).toEqual([WS_A, WS_A, WS_B]);
  });

  it('updates and deletes any action, whichever workspace is active', async () => {
    const store = await fresh();
    const action = await store.create(input());
    store.setWorkspace(WS_B);
    const renamed = await store.update(action.id, { name: '  Add A1  ', code: "addItem('A1', 2)" });
    expect(renamed).toMatchObject({ id: action.id, name: 'Add A1', target: 'name:cart', code: "addItem('A1', 2)", createdAt: action.createdAt });
    expect(renamed.updatedAt).toBeGreaterThanOrEqual(action.updatedAt);

    await store.remove(action.id);
    store.setWorkspace(WS_A);
    expect(store.list()).toEqual([]);
    await expect(store.update(action.id, { name: 'x' })).rejects.toThrow('That action no longer exists');
    await expect(store.remove(action.id)).rejects.toThrow('That action no longer exists');
  });

  it('refuses what an action cannot be, with a readable message', async () => {
    const store = await fresh();
    await expect(store.create(null)).rejects.toThrow('An action is needed');
    await expect(store.create(input({ name: '   ' }))).rejects.toThrow('An action needs a name');
    await expect(store.create(input({ target: '' }))).rejects.toThrow('An action needs a frame to run in');
    await expect(store.create(input({ code: ' \n ' }))).rejects.toThrow('An action needs code to run');
    await expect(store.create(input({ code: 'x'.repeat(MAX_ACTION_CODE + 1) }))).rejects.toThrow('too long');
    const action = await store.create(input());
    await expect(store.update(action.id, { target: 42 as unknown as string })).rejects.toThrow('An action needs a frame to run in');
    expect(store.list()).toEqual([action]);
    // A long name is cut, and a missing frame name is none.
    const long = await store.create({ name: 'n'.repeat(MAX_ACTION_NAME + 10), target: 'top', code: 'go()' });
    expect(long.name).toHaveLength(MAX_ACTION_NAME);
    expect(long.targetName).toBe('');
  });

  it('changes nothing when the file cannot be written', async () => {
    const store = await fresh();
    const kept = await store.create(input());
    vi.spyOn(atomic, 'writeAtomic').mockRejectedValueOnce(new Error('disk full'));
    await expect(store.create(input({ name: 'Lost' }))).rejects.toThrow('disk full');
    expect(store.list()).toEqual([kept]);
    // The next change goes through, from the state as it was.
    await store.create(input({ name: 'Next' }));
    expect(store.list().map((a) => a.name)).toEqual(['Add item', 'Next']);
  });

  it('runs changes one at a time, each on the one before', async () => {
    const store = await fresh();
    const action = await store.create(input());
    await Promise.all([store.update(action.id, { name: 'One' }), store.update(action.id, { code: 'two()' }), store.create(input({ name: 'Three' }))]);
    expect(store.list().map((a) => [a.name, a.code])).toEqual([
      ['One', 'two()'],
      ['Three', "addItem('A1')"],
    ]);
  });

  it("deletes a workspace's actions and no one else's", async () => {
    const store = await fresh();
    await store.create(input());
    store.setWorkspace(WS_B);
    const kept = await store.create(input());
    await store.removeWorkspace(WS_A);
    expect(store.list()).toEqual([kept]);
    store.setWorkspace(WS_A);
    expect(store.list()).toEqual([]);
  });

  it('starts with none from a missing or corrupt file, and keeps only well-formed entries', async () => {
    expect((await fresh()).list()).toEqual([]);
    await writeFile(join(dir, 'actions.json'), '{ not json');
    expect((await fresh()).list()).toEqual([]);

    const good = { id: '0123abcd', workspaceId: WS_A, ...input(), createdAt: 1, updatedAt: 2 };
    await writeFile(
      join(dir, 'actions.json'),
      JSON.stringify({
        version: 1,
        actions: [
          good,
          { ...good }, // the same id again
          { ...good, id: '../../x' },
          { ...good, id: '0123abce', workspaceId: 'nope' },
          { ...good, id: '0123abcf', code: 42 },
          { ...good, id: '0123abd0', name: '' },
          { id: '0123abd1', workspaceId: WS_A, name: 'No times', target: 'top', code: 'go()' },
          'junk',
        ],
      }),
    );
    const store = await fresh();
    expect(store.list().map((a) => a.id)).toEqual(['0123abcd', '0123abd1']);
    expect(store.list()[0]).toEqual({ id: '0123abcd', ...input(), createdAt: 1, updatedAt: 2 });
    expect(store.list()[1]).toMatchObject({ targetName: '', createdAt: expect.any(Number) });
  });
});
