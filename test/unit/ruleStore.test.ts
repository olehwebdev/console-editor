import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RuleStore } from '../../src/main/store/RuleStore';
import { MAX_RULES } from '../../src/shared/rules';
import type { CreateRuleInput } from '../../src/shared/types';

/** Ids the next rules get, in order (then random ones again). */
const queuedIds = vi.hoisted(() => [] as string[]);
vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return { ...actual, randomBytes: (size: number) => (queuedIds.length > 0 ? Buffer.from(queuedIds.shift()!, 'hex') : actual.randomBytes(size)) };
});

let dir: string;
const index = () => join(dir, 'rules.json');
const readIndex = async () => JSON.parse(await readFile(index(), 'utf8')) as { version: number; rules: Array<Record<string, unknown>> };

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'console-editor-rules-'));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

const block = (pattern = 'https://a.com/ads.js'): CreateRuleInput => ({ action: 'block', match: { type: 'exact', pattern, ignoreQuery: true }, resourceTypes: [] });
const removeCsp: CreateRuleInput = {
  action: 'headers',
  match: { type: 'exact', pattern: 'https://a.com/', ignoreQuery: true },
  resourceTypes: ['Document'],
  headers: [{ operation: 'remove', name: 'Content-Security-Policy', value: '' }],
};

async function open(workspaceId = 'aaaaaaaa'): Promise<RuleStore> {
  const store = new RuleStore(dir);
  await store.load();
  store.setWorkspace(workspaceId);
  return store;
}

describe('RuleStore', () => {
  it('creates enabled rules, lists them without their workspace for the renderer, and keeps them on disk', async () => {
    const store = await open();
    const created = await store.create({ ...removeCsp, extra: 'dropped' } as CreateRuleInput);
    expect(created).toMatchObject({ ...removeCsp, workspaceId: 'aaaaaaaa', enabled: true });
    expect(created.id).toMatch(/^[0-9a-f]{8}$/);
    expect(created).not.toHaveProperty('extra');
    expect(store.forRenderer()).toEqual([{ ...removeCsp, id: created.id, enabled: true, createdAt: created.createdAt, updatedAt: created.updatedAt }]);
    expect(store.forRenderer()[0]).not.toHaveProperty('workspaceId');

    const file = await readIndex();
    expect(file).toEqual({ version: 1, rules: [created] });
    expect(Object.keys(file.rules[0])).toEqual(['workspaceId', 'id', 'action', 'match', 'resourceTypes', 'headers', 'enabled', 'createdAt', 'updatedAt']);
    expect(await readFile(index(), 'utf8')).toMatch(/^\{\n {2}"version": 1,[\s\S]*\}\n$/);

    const again = await open();
    expect(again.list()).toEqual([created]);
  });

  it("lists only the active workspace's rules, oldest first, as the same array until something changes", async () => {
    const now = vi.spyOn(Date, 'now');
    const store = await open();
    now.mockReturnValue(300);
    const late = await store.create(block('https://a.com/late.js'));
    now.mockReturnValue(100);
    const early = await store.create(block('https://a.com/early.js'));
    store.setWorkspace('bbbbbbbb');
    now.mockReturnValue(200);
    await store.create(block('https://b.com/ads.js'));
    store.setWorkspace('aaaaaaaa');

    const list = store.list();
    expect(list.map((r) => r.id)).toEqual([early.id, late.id]);
    expect(store.list()).toBe(list);
    await store.update(late.id, { enabled: false });
    expect(store.list()).not.toBe(list);
  });

  it('reaches rules of any workspace, and creates in the workspace active when asked', async () => {
    const store = await open();
    const a = await store.create(block());
    const late = store.create(block('https://a.com/late.js'));
    store.setWorkspace('bbbbbbbb');
    const lateRule = await late;
    expect(lateRule.workspaceId).toBe('aaaaaaaa');
    expect(store.list()).toEqual([]);

    expect(store.get(a.id).id).toBe(a.id);
    await store.update(a.id, { enabled: false });
    expect(store.get(a.id).enabled).toBe(false);
    await store.remove(lateRule.id);
    expect(() => store.get(lateRule.id)).toThrow(`Unknown rule ${lateRule.id}`);
    await expect(store.update('00000000', { enabled: true })).rejects.toThrow('Unknown rule');
    await expect(store.remove('00000000')).rejects.toThrow('Unknown rule');
  });

  it('keeps memory as it was when a write fails, and takes later changes', async () => {
    const store = await open();
    const rule = await store.create(block());
    // The index path becomes a folder: every write's rename fails.
    await rm(index());
    await mkdir(index());
    await expect(store.create(block('https://a.com/ghost.js'))).rejects.toThrow();
    await expect(store.update(rule.id, { enabled: false })).rejects.toThrow();
    expect(store.list()).toEqual([rule]);
    await rm(index(), { recursive: true });
    await store.update(rule.id, { enabled: false });
    expect(store.get(rule.id).enabled).toBe(false);
  });

  it('applies queued updates on top of each other', async () => {
    const store = await open();
    const rule = await store.create(removeCsp);
    const match = { type: 'glob' as const, pattern: 'https://a.com/*', ignoreQuery: true };
    await Promise.all([store.update(rule.id, { enabled: false }), store.update(rule.id, { match }), store.update(rule.id, { resourceTypes: [] })]);
    expect(store.get(rule.id)).toMatchObject({ enabled: false, match, resourceTypes: [], headers: removeCsp.headers });
  });

  it('refuses a workspace full of rules, headers on a rule of another action, and an invalid result', async () => {
    const store = await open();
    const rule = await store.create(block());
    await expect(store.update(rule.id, { headers: [{ operation: 'set', name: 'X', value: '1' }] })).rejects.toThrow('Only header rules have headers');
    await expect(store.update(rule.id, { match: { type: 'regex', pattern: '(', ignoreQuery: false } })).rejects.toThrow(/Invalid regular expression/);
    const csp = await store.create(removeCsp);
    await expect(store.update(csp.id, { headers: [] })).rejects.toThrow('Add at least one header change');
    await expect(store.create({ ...block(), match: { type: 'exact', pattern: 'data:text/js,1', ignoreQuery: false } })).rejects.toThrow(/ws:, data: and blob:/);
    expect(store.get(rule.id)).toEqual(rule);

    // Filled straight on disk: a full workspace, and one rule in another.
    const file = await readIndex();
    for (let i = file.rules.length; i < MAX_RULES; i++) file.rules.push({ ...file.rules[0], id: i.toString(16).padStart(8, '0') });
    await writeFile(index(), JSON.stringify(file));
    const full = await open();
    await expect(full.create(block())).rejects.toThrow(`A workspace holds at most ${MAX_RULES} rules`);
    full.setWorkspace('bbbbbbbb');
    await expect(full.create(block())).resolves.toMatchObject({ workspaceId: 'bbbbbbbb' });
  });

  it('deletes a workspace’s rules, including one created just before, and its unreadable entries', async () => {
    const store = await open();
    const kept = await store.create(block());
    store.setWorkspace('bbbbbbbb');
    await store.create(block('https://b.com/1.js'));
    const file = await readIndex();
    file.rules.push({ workspaceId: 'bbbbbbbb', id: 'abcdef01', action: 'redirect' }, { workspaceId: 'aaaaaaaa', id: 'abcdef02', action: 'redirect' });
    await writeFile(index(), JSON.stringify(file));
    const reloaded = await open('bbbbbbbb');

    const queued = reloaded.create(block('https://b.com/2.js'));
    await reloaded.removeWorkspace('bbbbbbbb');
    await queued;
    expect(reloaded.list()).toEqual([]);
    reloaded.setWorkspace('aaaaaaaa');
    expect(reloaded.list()).toEqual([kept]);
    expect((await readIndex()).rules.map((r) => r.id)).toEqual([kept.id, 'abcdef02']);
  });

  it('hands rules of no known workspace to the fallback, leaving unreadable entries alone', async () => {
    const store = await open();
    const lost = await store.create(block());
    const file = await readIndex();
    file.rules[0].workspaceId = '';
    const foreign = { workspaceId: 'gone0000', id: 'abcdef01', action: 'redirect' };
    file.rules.push(foreign);
    await writeFile(index(), JSON.stringify(file));

    const reloaded = await open('cccccccc');
    await reloaded.adopt(new Set(['cccccccc']), 'cccccccc');
    expect(reloaded.list().map((r) => r.id)).toEqual([lost.id]);
    expect((await readIndex()).rules).toEqual([{ ...lost, workspaceId: 'cccccccc' }, foreign]);
  });

  it('keeps entries it cannot read verbatim and last, through later writes, and never lists them', async () => {
    const store = await open();
    const rule = await store.create(block());
    const unknownAction = { workspaceId: 'aaaaaaaa', id: 'abcdef01', action: 'redirect', to: 'https://x', enabled: true };
    const unknownType = { ...rule, id: 'abcdef02', resourceTypes: ['WebSocket'] };
    const malformed = 'not a rule';
    const duplicate = { ...rule, match: { ...rule.match, pattern: 'https://a.com/dup.js' } };
    await writeFile(index(), JSON.stringify({ version: 1, rules: [unknownAction, rule, unknownType, malformed, duplicate] }));

    const reloaded = await open();
    expect(reloaded.list()).toEqual([rule]);
    const added = await reloaded.create(block('https://a.com/new.js'));
    expect([unknownAction.id, unknownType.id]).not.toContain(added.id);
    await reloaded.update(rule.id, { enabled: false });
    expect((await readIndex()).rules).toEqual([{ ...rule, enabled: false, updatedAt: expect.any(Number) }, added, unknownAction, unknownType, malformed, duplicate]);
  });

  it('gives new rules ids that no rule and no unreadable entry has', async () => {
    const store = await open();
    queuedIds.push('00000001');
    const first = await store.create(block());
    expect(first.id).toBe('00000001');
    const file = await readIndex();
    file.rules.push({ id: '00000002', action: 'redirect' });
    await writeFile(index(), JSON.stringify(file));
    const reloaded = await open();
    queuedIds.push('00000001', '00000002', '00000003');
    const created = await reloaded.create(block('https://a.com/other.js'));
    expect(created.id).toBe('00000003');
  });

  it('moves a file it cannot parse aside, and starts empty and writable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await writeFile(`${index()}.broken`, 'an older one');
    for (const text of ['{nope', JSON.stringify({ version: 1 }), JSON.stringify([])]) {
      await writeFile(index(), text);
      const store = await open();
      expect(store.setAside).toBe(`${index()}.broken`);
      expect(await readFile(`${index()}.broken`, 'utf8')).toBe(text);
      expect(store.list()).toEqual([]);
      await store.create(block());
      expect(store.list()).toHaveLength(1);
      await rm(index());
    }
    expect(warn).toHaveBeenCalled();
    const clean = await open();
    expect(clean.setAside).toBeUndefined();
  });

  it('starts empty without a file, and throws when the file cannot be read', async () => {
    const empty = await open();
    expect(empty.list()).toEqual([]);
    await expect(stat(index())).rejects.toThrow();
    await mkdir(index());
    await expect(new RuleStore(dir).load()).rejects.toThrow(/Could not read .*rules\.json/);
  });
});
