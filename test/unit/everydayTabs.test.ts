/**
 * Your everyday Firefox's tabs: its compressed session file (`mozLz40`, an LZ4 block) read, including one Firefox
 * wrote, its profiles found from profiles.ini (the install's default first), and the page each tab shows, on the web.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { listEverydayTabs } from '../../src/main/browsers/everyday';
import { lz4Block } from '../../src/main/browsers/everyday/lz4Block';
import { profilesOf } from '../../src/main/browsers/everyday/profilesOf';
import { readMozLz4 } from '../../src/main/browsers/everyday/readMozLz4';
import { sessionTabsOf } from '../../src/main/browsers/everyday/sessionTabsOf';
import { mozLz4 } from '../helpers/mozLz4';

const tmp = mkdtempSync(join(tmpdir(), 'console-editor-everyday-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const session = {
  windows: [
    { tabs: [{ index: 2, entries: [{ url: 'https://old.test/' }, { url: 'https://shop.test/cart', title: 'Cart' }] }, { index: 1, entries: [{ url: 'about:preferences' }] }] },
    { tabs: [{ entries: [{ url: 'http://localhost:3000/', title: '' }] }] },
  ],
};

describe('A Firefox session file', () => {
  it('is decompressed: one Firefox wrote (matches and all), and one of literals only', async () => {
    const real = JSON.parse((await readMozLz4(join(__dirname, '../fixtures/firefox/recovery.jsonlz4')))!) as { windows: unknown[] };
    expect(real.windows).toHaveLength(1);
    const path = join(tmp, 'plain.jsonlz4');
    writeFileSync(path, mozLz4(session));
    expect(JSON.parse((await readMozLz4(path))!)).toEqual(session);
  });

  it("is refused when it isn't one: no header, or a block pointing before its start", async () => {
    const path = join(tmp, 'bad.jsonlz4');
    writeFileSync(path, 'not a session');
    expect(await readMozLz4(path)).toBeNull();
    expect(await readMozLz4(join(tmp, 'missing.jsonlz4'))).toBeNull();
    // A literal, then a match 9 bytes back where only 1 was written.
    expect(() => lz4Block(Uint8Array.from([0x10, 0x41, 0x09, 0x00]), 10)).toThrow('Not an LZ4 block');
    // An overlapping match repeats the byte before it.
    expect(lz4Block(Uint8Array.from([0x10, 0x41, 0x01, 0x00, 0x00]), 10).toString()).toBe('AAAAA');
  });

  it('lists the page each tab shows, on the web only, titled by its address when it has no title', () => {
    expect(sessionTabsOf(JSON.stringify(session))).toEqual([
      { url: 'https://shop.test/cart', title: 'Cart' },
      { url: 'http://localhost:3000/', title: 'http://localhost:3000/' },
    ]);
    expect(sessionTabsOf('{')).toEqual([]);
  });
});

describe("Firefox's profiles", () => {
  it("are listed from profiles.ini, the install's default first, relative ones in the data folder", () => {
    const ini = ['[General]', 'Version=2', '', '[Profile1]', 'Name=work', 'IsRelative=1', 'Path=Profiles/w.work', '', '[Profile0]', 'Name=default-release', 'IsRelative=1', 'Path=Profiles/d.default-release', '', '[Profile2]', 'Name=elsewhere', 'IsRelative=0', 'Path=/data/ff', '', '[Install4F96D1932A9F858E]', 'Default=Profiles/d.default-release'].join('\n');
    expect(profilesOf('/home/me/.mozilla/firefox', ini)).toEqual([
      { name: 'default-release', dir: '/home/me/.mozilla/firefox/Profiles/d.default-release' },
      { name: 'work', dir: '/home/me/.mozilla/firefox/Profiles/w.work' },
      { name: 'elsewhere', dir: '/data/ff' },
    ]);
  });

  it("give the tabs of each profile with a session, from the system's own Firefox folder", async () => {
    const home = join(tmp, 'home');
    const data = join(home, '.mozilla/firefox');
    mkdirSync(join(data, 'Profiles/d.default/sessionstore-backups'), { recursive: true });
    mkdirSync(join(data, 'Profiles/e.empty'), { recursive: true });
    writeFileSync(join(data, 'profiles.ini'), '[Profile0]\nName=default\nIsRelative=1\nPath=Profiles/d.default\n[Profile1]\nName=empty\nIsRelative=1\nPath=Profiles/e.empty\n');
    writeFileSync(join(data, 'Profiles/d.default/sessionstore-backups/recovery.jsonlz4'), mozLz4(session));
    expect(await listEverydayTabs(home, 'linux')).toEqual([{ id: join(data, 'Profiles/d.default'), name: 'Firefox', profile: 'default', tabs: sessionTabsOf(JSON.stringify(session)) }]);
    expect(await listEverydayTabs(home, 'aix')).toEqual([]);
  });
});
