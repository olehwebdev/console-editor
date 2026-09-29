/**
 * Your everyday Firefox's tabs: its compressed session file (`mozLz40`, an LZ4 block) read, including one Firefox
 * wrote, its profiles found from profiles.ini (the install's default first), and the page each tab shows, on the web.
 * And your macOS browsers' tabs through scripting: the script run against a stand-in for JavaScript for Automation.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { listEverydayTabs, listsTabs } from '../../src/main/browsers/everyday';
import { scriptableApp } from '../../src/main/browsers/everyday/scriptable';
import { scriptTabsOf } from '../../src/main/browsers/everyday/scriptable/scriptTabsOf';
import { tabsScript } from '../../src/main/browsers/everyday/scriptable/tabsScript';
import type { FoundBrowser } from '../../src/main/browsers/types';
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
    expect(await listEverydayTabs([], home, 'linux')).toEqual([{ id: join(data, 'Profiles/d.default'), name: 'Firefox', profile: 'default', tabs: sessionTabsOf(JSON.stringify(session)) }]);
    expect(await listEverydayTabs([], home, 'aix')).toEqual([]);
  });
});

describe("Your macOS browsers' tabs, through scripting (JavaScript for Automation)", () => {
  const mac = (name: string, engine: FoundBrowser['engine'] = 'chromium'): FoundBrowser => ({ id: `mac:${name}`, name, engine, command: ['open', '-a', `/Applications/${name}.app`], urlAt: 3, iconFile: null, app: `/Applications/${name}.app`, program: null, added: false });
  const [safari, chrome, arc, opera, firefox] = [mac('Safari', 'webkit'), mac('Google Chrome'), mac('Arc'), mac('Opera'), mac('Firefox', 'gecko')];

  /**
   * A stand-in for JXA's `Application`: running apps' windows, each a tab list whose properties are read at once
   * (`w.tabs.url()` gives every tab's address), a window without tabs throwing as Safari's settings window does.
   */
  const automation = (apps: Record<string, { running: boolean; windows?: Array<Array<{ url: string; title: string }> | null>; refuse?: string }>) => (name: string) => {
    const app = apps[name];
    if (!app) throw new Error(`Can't get application "${name}"`);
    return {
      running: () => app.running,
      windows: () => {
        if (app.refuse) throw new Error(app.refuse);
        return (app.windows ?? []).map((tabs) => ({
          tabs: new Proxy({}, { get: (_, key: string) => () => {
            if (!tabs) throw new Error("Can't get tabs of window (-1728)");
            return tabs.map((t) => (key === 'url' ? t.url : (t as Record<string, string>)[key === 'name' ? 'title' : key]));
          } }),
        }));
      },
    };
  };
  const runScript = (script: string, apps: Parameters<typeof automation>[0]) => String(runInNewContext(script, { Application: automation(apps) }));

  it('are asked of the browsers scripting reaches, by the name of their app', () => {
    expect([safari, chrome, arc, opera, firefox].map(scriptableApp)).toEqual(['Safari', 'Google Chrome', 'Arc', null, null]);
    expect(scriptableApp({ ...chrome, app: null })).toBeNull();
    expect([safari, chrome, opera, firefox].map((b) => listsTabs(b, 'darwin'))).toEqual([true, true, false, true]);
    expect([safari, chrome, firefox].map((b) => listsTabs(b, 'linux'))).toEqual([false, false, true]);
  });

  it("are read by a script of running apps' windows (Safari's titles are names), skipping a window without tabs", () => {
    const output = runScript(tabsScript(['Safari', 'Google Chrome', 'Arc']), {
      Safari: { running: true, windows: [[{ url: 'https://shop.test/', title: 'Shop' }], null] },
      'Google Chrome': { running: true, windows: [[{ url: 'https://a.test/', title: 'A' }, { url: 'chrome://settings/', title: 'Settings' }], [{ url: 'http://localhost:3000/', title: '' }]] },
      Arc: { running: false },
    });
    expect(JSON.parse(output)).toEqual([
      { name: 'Safari', running: true, tabs: [['https://shop.test/', 'Shop']] },
      { name: 'Google Chrome', running: true, tabs: [['https://a.test/', 'A'], ['chrome://settings/', 'Settings'], ['http://localhost:3000/', '']] },
      { name: 'Arc', running: false, tabs: [] },
    ]);
  });

  it("give running browsers' pages on the web, titled by their address when untitled, and why one couldn't be read", () => {
    const ids = new Map([['Safari', 'mac:Safari'], ['Google Chrome', 'mac:Google Chrome'], ['Arc', 'mac:Arc']]);
    const output = runScript(tabsScript(['Safari', 'Google Chrome', 'Arc']), {
      Safari: { running: true, refuse: 'Error: Not authorized to send Apple events to Safari. (-1743)' },
      'Google Chrome': { running: true, windows: [[{ url: 'https://a.test/', title: 'A' }, { url: 'chrome://settings/', title: 'Settings' }, { url: 'http://localhost:3000/', title: '' }]] },
      Arc: { running: false },
    });
    expect(scriptTabsOf(output, ids)).toEqual([
      { id: 'mac:Safari', name: 'Safari', profile: null, tabs: [], problem: 'Allow Console Editor to control Safari in System Settings › Privacy & Security › Automation' },
      { id: 'mac:Google Chrome', name: 'Google Chrome', profile: null, tabs: [{ url: 'https://a.test/', title: 'A' }, { url: 'http://localhost:3000/', title: 'http://localhost:3000/' }] },
    ]);
    expect(scriptTabsOf('[{"name":"Arc","running":true,"tabs":[],"error":"Error: timed out"}]', ids)).toEqual([{ id: 'mac:Arc', name: 'Arc', profile: null, tabs: [], problem: 'Could not read its tabs: Error: timed out' }]);
    expect(scriptTabsOf('not json', ids)).toEqual([]);
    expect(scriptTabsOf('[{"name":"Unknown","running":true,"tabs":[]}]', ids)).toEqual([]);
  });

  it('are read on macOS only, in one script for every browser that has them, beside Firefox', async () => {
    const calls: Array<[string, string[]]> = [];
    const run = async (file: string, args: string[]) => {
      calls.push([file, args]);
      return runScript(args.at(-1)!, { Safari: { running: true, windows: [[{ url: 'https://shop.test/', title: 'Shop' }]] }, 'Google Chrome': { running: false } });
    };
    const home = join(tmp, 'mac-home');
    expect(await listEverydayTabs([safari, chrome, opera, firefox], home, 'darwin', run)).toEqual([{ id: 'mac:Safari', name: 'Safari', profile: null, tabs: [{ url: 'https://shop.test/', title: 'Shop' }] }]);
    expect(calls.map(([file, args]) => [file, ...args.slice(0, -1)])).toEqual([['osascript', '-l', 'JavaScript', '-e']]);
    expect(await listEverydayTabs([opera, firefox], home, 'darwin', run)).toEqual([]);
    expect(await listEverydayTabs([safari, chrome], home, 'linux', run)).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});
