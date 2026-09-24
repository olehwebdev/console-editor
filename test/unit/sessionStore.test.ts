import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionStore } from '../../src/main/store/SessionStore';
import type { SessionTab } from '../../src/shared/types';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'console-editor-session-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const tab = (id: string, extra: Partial<SessionTab> = {}): SessionTab => ({ id, url: `https://a.com/${id}.js`, kind: 'Script', originalHash: 'h', ...extra });

async function fresh(): Promise<SessionStore> {
  const s = new SessionStore(dir);
  await s.load();
  return s;
}

/** Sets the active workspace's tabs. */
const setTabs = (s: SessionStore, tabs: unknown, activeTabId: unknown) => s.setTabs(s.activeId, tabs, activeTabId);

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('SessionStore', () => {
  it('starts empty and remembers the page, tabs and drafts across instances', async () => {
    const a = await fresh();
    expect(a.get()).toEqual({ url: '', tabs: [], activeTabId: null });
    await a.setUrl('https://a.com/page');
    await setTabs(a, [tab('t1'), tab('t2', { overrideId: 'o1' })], 't2');
    await a.saveDraft('t1', { content: 'edited', base: 'original' });
    await a.saveDraft('t2', { content: 'edited override' });

    const b = await fresh();
    expect(b.get()).toEqual({ url: 'https://a.com/page', tabs: [tab('t1'), tab('t2', { overrideId: 'o1' })], activeTabId: 't2' });
    expect(await b.getDraft('t1')).toEqual({ content: 'edited', base: 'original' });
    expect(await b.getDraft('t2')).toEqual({ content: 'edited override' });
  });

  it('keeps a draft base when later drafts omit it', async () => {
    const s = await fresh();
    await setTabs(s, [tab('t1')], 't1');
    await s.saveDraft('t1', { content: 'v1', base: 'original' });
    await s.saveDraft('t1', { content: 'v2' });
    expect(await s.getDraft('t1')).toEqual({ content: 'v2', base: 'original' });
    await s.deleteDraft('t1');
    expect(await s.getDraft('t1')).toBeNull();
  });

  it('deletes the drafts of closed tabs, and orphans on load', async () => {
    const s = await fresh();
    await setTabs(s, [tab('t1'), tab('t2')], 't1');
    await s.saveDraft('t1', { content: 'a', base: 'b' });
    await s.saveDraft('t2', { content: 'c' });
    await setTabs(s, [tab('t2')], 't2');
    expect((await readdir(join(dir, 'drafts'))).sort()).toEqual(['t2.txt']);

    await writeFile(join(dir, 'drafts', 'ghost.txt'), 'x');
    await fresh();
    expect(await readdir(join(dir, 'drafts'))).toEqual(['t2.txt']);
  });

  it('only remembers http(s) pages', async () => {
    const s = await fresh();
    await s.setUrl('about:blank');
    await s.setUrl('chrome-error://chromewebdata/');
    expect(s.get().url).toBe('');
  });

  it('rejects tab ids that could escape the drafts folder, and drops malformed tabs', async () => {
    const s = await fresh();
    expect(() => s.saveDraft('../../evil', { content: 'x' })).toThrow(/Invalid tab id/);
    await expect(s.getDraft('a/b')).rejects.toThrow(/Invalid tab id/);
    await setTabs(s, [tab('ok'), { id: '../x', url: 'u', kind: 'Script' }, { id: 'y', url: 'u', kind: 'Image' }, null], 'y');
    expect(s.get().tabs.map((t) => t.id)).toEqual(['ok']);
    expect(s.get().activeTabId).toBeNull();
  });

  it('survives a corrupt session file', async () => {
    const s = await fresh();
    await setTabs(s, [tab('t1')], 't1');
    await writeFile(join(dir, 'session.json'), '{nope');
    const after = await fresh();
    expect(after.get()).toEqual({ url: '', tabs: [], activeTabId: null });
    expect(after.workspaces().workspaces).toHaveLength(1);
  });
});

describe('SessionStore workspaces', () => {
  it('starts with one workspace, and moves a version 1 session into it', async () => {
    const empty = await fresh();
    const { workspaces, activeId } = empty.workspaces();
    expect(workspaces).toEqual([{ id: activeId, name: '', host: '', title: '', icon: 'favicon', color: 'ember' }]);

    await writeFile(join(dir, 'session.json'), JSON.stringify({ version: 1, url: 'https://a.com/page', tabs: [tab('t1')], activeTabId: 't1' }));
    await writeFile(join(dir, 'drafts', 't1.txt'), 'draft');
    const s = await fresh();
    expect(s.get()).toEqual({ url: 'https://a.com/page', tabs: [tab('t1')], activeTabId: 't1' });
    expect(s.workspaces().workspaces).toEqual([expect.objectContaining({ id: s.activeId, host: 'a.com' })]);
    expect(await s.getDraft('t1')).toEqual({ content: 'draft' });
    // Written in the new form straight away, so the workspace keeps its id.
    expect(JSON.parse(await readFile(join(dir, 'session.json'), 'utf8'))).toMatchObject({ version: 2, activeId: s.activeId });
    expect((await fresh()).activeId).toBe(s.activeId);
  });

  it('keeps a page, tabs and drafts per workspace, and which one is active', async () => {
    const s = await fresh();
    const first = s.activeId;
    await s.setUrl('https://a.com/');
    await setTabs(s, [tab('a1')], 'a1');
    await s.saveDraft('a1', { content: 'a draft' });

    const second = await s.create();
    expect(second).toEqual({ id: expect.stringMatching(/^[0-9a-f]{8}$/), name: '', host: '', title: '', icon: 'favicon', color: 'amber' });
    await s.setActive(second.id);
    expect(s.get()).toEqual({ url: '', tabs: [], activeTabId: null });
    await s.setUrl('https://b.com/x');
    await s.setTitle(second.id, '  B · Page  ');
    await setTabs(s, [tab('b1')], null);

    const again = await fresh();
    expect(again.activeId).toBe(second.id);
    expect(again.get()).toEqual({ url: 'https://b.com/x', tabs: [tab('b1')], activeTabId: null });
    // The other workspace's tabs keep their drafts: only closed tabs lose theirs.
    expect(await again.getDraft('a1')).toEqual({ content: 'a draft' });
    await again.setActive(first);
    expect(again.get()).toEqual({ url: 'https://a.com/', tabs: [tab('a1')], activeTabId: 'a1' });
    expect(again.workspaces().workspaces.map((w) => [w.host, w.title])).toEqual([
      ['a.com', ''],
      ['b.com', 'B · Page'],
    ]);
  });

  it('writes tabs to the workspace named, not the active one, and ignores a deleted one', async () => {
    const s = await fresh();
    const first = s.activeId;
    const other = await s.create();
    await s.setTabs(other.id, [tab('o1')], 'o1');
    expect(s.get().tabs).toEqual([]);
    await s.setActive(other.id);
    expect(s.get().tabs).toEqual([tab('o1')]);
    await s.setActive(first);
    await s.remove(other.id);
    await s.setTabs(other.id, [tab('o2')], 'o2');
    expect(s.workspaces().workspaces.map((w) => w.id)).toEqual([first]);
  });

  it('renames and recolours, within limits', async () => {
    const s = await fresh();
    const updated = await s.update(s.activeId, { name: 'x'.repeat(100), icon: 'color', color: 'violet' });
    expect(updated).toMatchObject({ name: 'x'.repeat(40), icon: 'color', color: 'violet' });
    await expect(s.update(s.activeId, { color: 'plaid' as never })).rejects.toThrow(/colour/);
    await expect(s.update(s.activeId, { icon: 'emoji' as never })).rejects.toThrow(/icon/);
    await expect(s.update('nope', { name: 'a' })).rejects.toThrow(/Unknown workspace/);
    expect((await fresh()).workspaces().workspaces[0]).toMatchObject({ name: 'x'.repeat(40), icon: 'color', color: 'violet' });
  });

  it('deletes a workspace with its drafts and icon, but never the active one', async () => {
    const s = await fresh();
    const other = await s.create();
    await s.setTabs(other.id, [tab('o1')], 'o1');
    await s.saveDraft('o1', { content: 'x', base: 'y' });
    await s.setFavicon(other.id, PNG);
    await expect(s.remove(s.activeId)).rejects.toThrow(/in use/);
    await s.remove(other.id);
    expect(await readdir(join(dir, 'drafts'))).toEqual([]);
    expect(await readdir(join(dir, 'favicons'))).toEqual([]);
    expect(s.favicon(other.id)).toBeNull();
  });

  it("keeps each workspace's favicon until its page moves to another site", async () => {
    const s = await fresh();
    await s.setUrl('https://a.com/');
    await s.setFavicon(s.activeId, PNG);
    await s.setFavicon(s.activeId, 'javascript:alert(1)');
    expect((await fresh()).favicon(s.activeId)).toBe(PNG);
    await s.setUrl('https://a.com/other');
    expect(s.favicon(s.activeId)).toBe(PNG);
    await s.setUrl('https://b.com/');
    expect(s.favicon(s.activeId)).toBeNull();
    expect(await readdir(join(dir, 'favicons'))).toEqual([]);
  });

  it('drops malformed workspaces, and icons of workspaces that are gone', async () => {
    await writeFile(
      join(dir, 'session.json'),
      JSON.stringify({
        version: 2,
        activeId: 'missing',
        workspaces: [{ id: '../../x' }, { id: 'abcdef01', name: 7, color: 'plaid', icon: 'emoji', url: 'https://a.com/', tabs: [tab('t1'), { id: 'bad/' }], activeTabId: 'gone' }],
      }),
    );
    await mkdir(join(dir, 'favicons'));
    await writeFile(join(dir, 'favicons', '12345678.txt'), PNG);
    const s = await fresh();
    expect(s.activeId).toBe('abcdef01');
    expect(s.workspaces().workspaces).toEqual([{ id: 'abcdef01', name: '', host: 'a.com', title: '', icon: 'favicon', color: 'ember' }]);
    expect(s.get()).toEqual({ url: 'https://a.com/', tabs: [tab('t1')], activeTabId: null });
    expect(await readdir(join(dir, 'favicons'))).toEqual([]);
  });
});
