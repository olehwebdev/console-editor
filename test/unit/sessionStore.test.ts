import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
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

describe('SessionStore', () => {
  it('starts empty and remembers the page, tabs and drafts across instances', async () => {
    const a = await fresh();
    expect(a.get()).toEqual({ url: '', tabs: [], activeTabId: null });
    await a.setUrl('https://a.com/page');
    await a.setTabs([tab('t1'), tab('t2', { overrideId: 'o1' })], 't2');
    await a.saveDraft('t1', { content: 'edited', base: 'original' });
    await a.saveDraft('t2', { content: 'edited override' });

    const b = await fresh();
    expect(b.get()).toEqual({ url: 'https://a.com/page', tabs: [tab('t1'), tab('t2', { overrideId: 'o1' })], activeTabId: 't2' });
    expect(await b.getDraft('t1')).toEqual({ content: 'edited', base: 'original' });
    expect(await b.getDraft('t2')).toEqual({ content: 'edited override' });
  });

  it('keeps a draft base when later drafts omit it', async () => {
    const s = await fresh();
    await s.setTabs([tab('t1')], 't1');
    await s.saveDraft('t1', { content: 'v1', base: 'original' });
    await s.saveDraft('t1', { content: 'v2' });
    expect(await s.getDraft('t1')).toEqual({ content: 'v2', base: 'original' });
    await s.deleteDraft('t1');
    expect(await s.getDraft('t1')).toBeNull();
  });

  it('deletes the drafts of closed tabs, and orphans on load', async () => {
    const s = await fresh();
    await s.setTabs([tab('t1'), tab('t2')], 't1');
    await s.saveDraft('t1', { content: 'a', base: 'b' });
    await s.saveDraft('t2', { content: 'c' });
    await s.setTabs([tab('t2')], 't2');
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
    await s.setTabs([tab('ok'), { id: '../x', url: 'u', kind: 'Script' }, { id: 'y', url: 'u', kind: 'Image' }, null], 'y');
    expect(s.get().tabs.map((t) => t.id)).toEqual(['ok']);
    expect(s.get().activeTabId).toBeNull();
  });

  it('survives a corrupt session file', async () => {
    await (await fresh()).setTabs([tab('t1')], 't1');
    await writeFile(join(dir, 'session.json'), '{nope');
    expect((await fresh()).get()).toEqual({ url: '', tabs: [], activeTabId: null });
  });
});
