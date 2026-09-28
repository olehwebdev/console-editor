/**
 * Other browsers: finding them the way each system lists them (Linux launchers and icon themes, macOS apps, the
 * Windows registry), telling their engines apart, what the user added or hid, and opening a page in one; and how a
 * Chromium browser is started to be driven (its command, profile folder and debugging port's address) and its tabs kept.
 */
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getFileIcon: async () => ({ isEmpty: () => true }) },
  nativeImage: {
    createFromBuffer: (bytes: Buffer) => ({
      isEmpty: () => bytes.length === 0,
      resize: () => ({ toDataURL: () => 'data:image/png;base64,SMALL' }),
    }),
  },
}));

const { parseDesktopEntry } = await import('../../src/main/browsers/findBrowsers/linux/parseDesktopEntry');
const { splitExec } = await import('../../src/main/browsers/findBrowsers/linux/splitExec');
const { commandOf } = await import('../../src/main/browsers/findBrowsers/linux/commandOf');
const { isBrowserEntry } = await import('../../src/main/browsers/findBrowsers/linux/isBrowserEntry');
const { programOf } = await import('../../src/main/browsers/findBrowsers/linux/programOf');
const { findLinuxBrowsers } = await import('../../src/main/browsers/findBrowsers/linux/findLinuxBrowsers');
const { labelDuplicates } = await import('../../src/main/browsers/findBrowsers/linux/labelDuplicates');
const { parseRegQuery } = await import('../../src/main/browsers/findBrowsers/windows/parseRegQuery');
const { programOfCommand } = await import('../../src/main/browsers/findBrowsers/windows/programOfCommand');
const { engineOf } = await import('../../src/main/browsers/engineOf');
const { launchEnv } = await import('../../src/main/browsers/launchEnv');
const { BrowserRegistry } = await import('../../src/main/browsers');
const { driveCommand } = await import('../../src/main/browsers/driven/driveCommand');
const { profileDir } = await import('../../src/main/browsers/driven/profileDir');
const { readActivePort } = await import('../../src/main/browsers/driven/chromium/readActivePort');
const { DrivenTabs } = await import('../../src/main/browsers/driven/DrivenTabs');
type DrivenTabState = import('../../src/main/browsers/driven/chromium/types').DrivenTabState;
const { BrowserStore } = await import('../../src/main/store/BrowserStore');
type FoundBrowser = import('../../src/main/browsers').FoundBrowser;

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'console-editor-browsers-')));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** An executable shell script at `path` (made with its folders). */
function script(path: string, body: string): string {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

/** A launcher file (made with its folders). */
function launcher(path: string, keys: Record<string, string>): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, ['[Desktop Entry]', ...Object.entries(keys).map(([k, v]) => `${k}=${v}`), '', '[Desktop Action new-window]', 'Name=New Window', 'Exec=ignored'].join('\n'));
}

describe('Linux launchers', () => {
  it('reads the entry group only, without localized keys, and unescapes values', () => {
    const keys = parseDesktopEntry('# comment\n[Desktop Entry]\nName=Fire\\sfox\nName[de]=Feuerfuchs\nExec=firefox %u\n\n[Desktop Action private]\nName=Private\nExec=firefox --private-window %u\n');
    expect(keys).toEqual({ Name: 'Fire fox', Exec: 'firefox %u' });
  });

  it('splits Exec as the spec quotes it', () => {
    expect(splitExec('"/opt/My Browser/browser" --flag "a \\"quoted\\" \\$word" %U')).toEqual(['/opt/My Browser/browser', '--flag', 'a "quoted" $word', '%U']);
    expect(splitExec('  env  A=1   firefox\t%u ')).toEqual(['env', 'A=1', 'firefox', '%u']);
    expect(splitExec('browser ""')).toEqual(['browser', '']);
  });

  it('puts the address where the first URL field code was, drops the other codes, and keeps a literal percent', () => {
    expect(commandOf(['chrome', '--profile', '%U', '%i', '%c'])).toEqual({ command: ['chrome', '--profile'], urlAt: 2 });
    expect(commandOf(['flatpak', 'run', 'org.mozilla.firefox', '@@u', '%u', '@@'])).toEqual({ command: ['flatpak', 'run', 'org.mozilla.firefox', '@@u', '@@'], urlAt: 4 });
    expect(commandOf(['browser', '--zoom=100%%'])).toEqual({ command: ['browser', '--zoom=100%'], urlAt: 2 });
    expect(commandOf(['a', '%u', '%U'])).toEqual({ command: ['a'], urlAt: 1 });
  });

  it('knows the program past env and its assignments', () => {
    expect(programOf(['env', 'BAMF=1', 'X_Y=2', '/snap/bin/firefox', '--new'])).toBe('/snap/bin/firefox');
    expect(programOf(['google-chrome-stable'])).toBe('google-chrome-stable');
    expect(programOf(['env'])).toBeNull();
  });

  it('offers browsers: the category, or web links with HTML; not hidden entries, terminals or the app itself', () => {
    const base = { Type: 'Application', Name: 'B', Exec: 'b %u' };
    expect(isBrowserEntry({ ...base, Categories: 'Network;WebBrowser;' }, 'b.desktop')).toBe(true);
    expect(isBrowserEntry({ ...base, MimeType: 'text/html;x-scheme-handler/https;' }, 'b.desktop')).toBe(true);
    expect(isBrowserEntry({ ...base, MimeType: 'x-scheme-handler/https;' }, 'b.desktop')).toBe(false);
    expect(isBrowserEntry({ ...base, Categories: 'WebBrowser;', NoDisplay: 'true' }, 'b.desktop')).toBe(false);
    expect(isBrowserEntry({ ...base, Categories: 'WebBrowser;', Terminal: 'true' }, 'b.desktop')).toBe(false);
    expect(isBrowserEntry({ ...base, Categories: 'WebBrowser;' }, 'console-editor.desktop')).toBe(false);
    expect(isBrowserEntry({ ...base, Type: 'Link', Categories: 'WebBrowser;' }, 'b.desktop')).toBe(false);
  });

  describe('finding them', () => {
    const env = { ...process.env };
    const home = join(tmp, 'linux-home');
    const system = join(tmp, 'linux-system');
    const bin = join(tmp, 'linux-bin');

    beforeEach(() => {
      process.env.XDG_DATA_HOME = home;
      process.env.XDG_DATA_DIRS = system;
      script(join(bin, 'fake-chrome'), 'exit 0');
      script(join(bin, 'fake-gecko'), 'exit 0');
      launcher(join(system, 'applications/fake-chrome.desktop'), { Type: 'Application', Name: 'Fake Chrome', Exec: `${bin}/fake-chrome --flag %U`, Icon: 'fake-chrome', Categories: 'Network;WebBrowser;' });
      launcher(join(system, 'applications/vendor/fake-gecko.desktop'), { Type: 'Application', Name: 'Fake Firefox', Exec: `${bin}/fake-gecko %u`, Icon: `${system}/abs.svg`, MimeType: 'text/html;x-scheme-handler/http;' });
      // The user's entry of the same id replaces the system's, browser or not.
      launcher(join(system, 'applications/replaced.desktop'), { Type: 'Application', Name: 'Replaced', Exec: `${bin}/fake-chrome`, Categories: 'WebBrowser;' });
      launcher(join(home, 'applications/replaced.desktop'), { Type: 'Application', Name: 'Replaced', Exec: `${bin}/fake-chrome`, NoDisplay: 'true', Categories: 'WebBrowser;' });
      // Uninstalled: its program is gone.
      launcher(join(system, 'applications/gone.desktop'), { Type: 'Application', Name: 'Gone', Exec: `${bin}/nothing-here %u`, Categories: 'WebBrowser;' });
      launcher(join(system, 'applications/editor.desktop'), { Type: 'Application', Name: 'Editor', Exec: `${bin}/fake-chrome`, Categories: 'Development;' });
      mkdirSync(join(system, 'icons/hicolor/48x48/apps'), { recursive: true });
      mkdirSync(join(system, 'icons/hicolor/128x128/apps'), { recursive: true });
      writeFileSync(join(system, 'icons/hicolor/48x48/apps/fake-chrome.png'), 'small');
      writeFileSync(join(system, 'icons/hicolor/128x128/apps/fake-chrome.png'), 'large');
      writeFileSync(join(system, 'abs.svg'), '<svg/>');
    });
    afterEach(() => {
      process.env.XDG_DATA_HOME = env.XDG_DATA_HOME;
      process.env.XDG_DATA_DIRS = env.XDG_DATA_DIRS;
      if (env.XDG_DATA_HOME === undefined) delete process.env.XDG_DATA_HOME;
      if (env.XDG_DATA_DIRS === undefined) delete process.env.XDG_DATA_DIRS;
    });

    it('lists the browsers whose program is there, with their engine, command and best icon', async () => {
      // Flatpak's and Snap's exports are looked in too: only this test's launchers are compared.
      const found = (await findLinuxBrowsers()).filter((b) => b.program?.startsWith(bin));
      expect(found).toEqual([
        {
          id: 'desktop:fake-chrome.desktop',
          name: 'Fake Chrome',
          engine: 'chromium',
          command: [`${bin}/fake-chrome`, '--flag'],
          urlAt: 2,
          iconFile: join(system, 'icons/hicolor/128x128/apps/fake-chrome.png'),
          app: null,
          program: `${bin}/fake-chrome`,
          added: false,
        },
        expect.objectContaining({ id: 'desktop:vendor-fake-gecko.desktop', name: 'Fake Firefox', engine: 'gecko', iconFile: join(system, 'abs.svg'), urlAt: 1 }),
      ]);
    });
  });

  it('tells two browsers of one name apart by where they came from', () => {
    const b = (name: string) => ({ id: name, name, engine: 'gecko', command: [], urlAt: 0, iconFile: null, app: null, program: null, added: false }) as FoundBrowser;
    const named = labelDuplicates([
      { browser: b('Firefox'), path: '/usr/share/applications/firefox.desktop' },
      { browser: b('Firefox'), path: '/var/lib/snapd/desktop/applications/firefox_firefox.desktop' },
      { browser: b('Firefox'), path: '/var/lib/flatpak/exports/share/applications/org.mozilla.firefox.desktop' },
      { browser: b('Chromium'), path: '/var/lib/snapd/desktop/applications/chromium.desktop' },
    ]).map((x) => x.name);
    expect(named).toEqual(['Firefox', 'Firefox (Snap)', 'Firefox (Flatpak)', 'Chromium']);
  });
});

describe('Windows registry', () => {
  const output = [
    '',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Clients\\StartMenuInternet\\Google Chrome',
    '    (Default)    REG_SZ    Google Chrome',
    '',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Clients\\StartMenuInternet\\Google Chrome\\shell\\open\\command',
    '    (Default)    REG_SZ    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"',
    '',
    'HKEY_LOCAL_MACHINE\\SOFTWARE\\Clients\\StartMenuInternet\\Firefox-308046B0AF4A39CB',
    '    (Default)    REG_SZ    Firefox',
    '    Empty    REG_SZ',
    '',
  ].join('\r\n');

  it('reads keys and values, case aside', () => {
    const keys = parseRegQuery(output);
    const chrome = keys.get('hkey_local_machine\\software\\clients\\startmenuinternet\\google chrome\\shell\\open\\command');
    expect(chrome?.values.get('(default)')).toBe('"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"');
    expect(keys.get('hkey_local_machine\\software\\clients\\startmenuinternet\\firefox-308046b0af4a39cb')?.values.get('empty')).toBe('');
    expect(keys.get('hkey_local_machine\\software\\clients\\startmenuinternet\\google chrome')?.path).toBe('HKEY_LOCAL_MACHINE\\SOFTWARE\\Clients\\StartMenuInternet\\Google Chrome');
  });

  it("takes a command's program, quoted or not", () => {
    expect(programOfCommand('"C:\\Program Files\\Mozilla Firefox\\firefox.exe" -osint -url "%1"')).toBe('C:\\Program Files\\Mozilla Firefox\\firefox.exe');
    expect(programOfCommand('C:\\Browsers\\brave.exe --flag')).toBe('C:\\Browsers\\brave.exe');
    expect(programOfCommand('"unterminated')).toBeNull();
    expect(programOfCommand('   ')).toBeNull();
  });
});

describe('Engines', () => {
  it('tells engines from names, and knows when it can’t', () => {
    expect(engineOf(['org.mozilla.firefox.desktop'])).toBe('gecko');
    expect(engineOf(['/usr/bin/librewolf'])).toBe('gecko');
    expect(engineOf(['Zen Browser'])).toBe('gecko');
    expect(engineOf(['Safari Technology Preview'])).toBe('webkit');
    expect(engineOf(['org.gnome.Epiphany.desktop'])).toBe('webkit');
    expect(engineOf(['C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'.replaceAll('\\', '/')])).toBe('chromium');
    expect(engineOf(['Arc'])).toBe('chromium');
    expect(engineOf(['Archive Utility'])).toBe('unknown');
    expect(engineOf([null, 'Brave Browser'])).toBe('chromium');
    expect(engineOf(['Lynx'])).toBe('unknown');
  });

  it('starts browsers without the libraries an AppImage set for the app', () => {
    const env = { APPIMAGE: '/x.AppImage', LD_LIBRARY_PATH: '/tmp/.mount/usr/lib', HOME: '/home/u' };
    expect(launchEnv(env)).toEqual({ APPIMAGE: '/x.AppImage', HOME: '/home/u' });
    const plain = { LD_LIBRARY_PATH: '/opt/lib' };
    expect(launchEnv(plain)).toBe(plain);
  });
});

describe('Added and hidden browsers', () => {
  it('keeps them across a restart, and reads a malformed or newer file as none', async () => {
    const path = join(tmp, 'prefs', 'browsers.json');
    const store = new BrowserStore(path);
    await store.load();
    await store.add({ id: 'added:0a1b2c3d', name: 'Nightly', path: '/opt/nightly/firefox', engine: 'gecko' });
    await store.setHidden('desktop:chromium.desktop', true);
    await store.setHidden('added:0a1b2c3d', true);
    await store.setHidden('added:0a1b2c3d', false);

    const again = new BrowserStore(path);
    await again.load();
    expect(again.get()).toEqual({ added: [{ id: 'added:0a1b2c3d', name: 'Nightly', path: '/opt/nightly/firefox', engine: 'gecko' }], hidden: ['desktop:chromium.desktop'] });

    await again.remove('added:0a1b2c3d');
    expect(again.get().added).toEqual([]);

    writeFileSync(path, JSON.stringify({ version: 2, added: [], hidden: ['x'] }));
    await again.load();
    expect(again.get()).toEqual({ added: [], hidden: [] });
    writeFileSync(path, JSON.stringify({ version: 1, added: [{ id: 'nope', name: 'X', path: '/x', engine: 'gecko' }, { id: 'added:00000000', name: 'Y', path: '/y', engine: 'blink' }], hidden: [1, 'a', 'a'] }));
    await again.load();
    expect(again.get()).toEqual({ added: [], hidden: ['a'] });
  });
});

describe('The registry', () => {
  const out = join(tmp, 'opened.txt');
  const fake = script(join(tmp, 'registry-bin', 'fake-browser'), `if [ "$1" = "--version" ]; then echo "Fake Browser 12.3.4"; exit 0; fi\necho "$@" > ${out}`);
  const found: FoundBrowser = { id: 'desktop:fake.desktop', name: 'Fake', engine: 'chromium', command: [fake, '--new-window'], urlAt: 2, iconFile: null, app: null, program: fake, added: false };

  async function registry() {
    const prefs = new BrowserStore(join(mkdtempSync(join(tmp, 'registry-')), 'browsers.json'));
    await prefs.load();
    const events: unknown[] = [];
    const find = vi.fn(async () => [found]);
    return { registry: new BrowserRegistry({ prefs, send: (e) => events.push(e), find }), events, find, prefs };
  }

  it('lists what it found, looks again only after a minute, and announces versions once read', async () => {
    const { registry: r, events, find } = await registry();
    expect(await r.list()).toEqual([{ id: found.id, name: 'Fake', engine: 'chromium', version: null, icon: null, added: false, hidden: false }]);
    await r.list();
    expect(find).toHaveBeenCalledTimes(1);
    await expect.poll(() => events.length).toBe(1);
    expect(events[0]).toEqual({ type: 'browsers-changed', browsers: [expect.objectContaining({ id: found.id, version: '12.3.4' })] });
  });

  it('opens an http(s) address with the browser’s command, and nothing else', async () => {
    const { registry: r } = await registry();
    await r.open(found.id, 'https://shop.test/cart?x=1');
    await expect.poll(() => readFileSync(out, 'utf8').trim()).toBe('--new-window https://shop.test/cart?x=1');
    await expect(r.open(found.id, 'file:///etc/passwd')).rejects.toThrow('Only http(s)');
    await expect(r.open('desktop:unknown.desktop', 'https://shop.test/')).rejects.toThrow('no longer there');
  });

  it('adds a program, hides and removes it, and refuses what can’t be run', async () => {
    const { registry: r, events } = await registry();
    const added = await r.add(fake);
    expect(added).toEqual({ id: expect.stringMatching(/^added:[0-9a-f]{8}$/), name: 'fake-browser', engine: 'unknown', version: null, icon: null, added: true, hidden: false });
    await r.setHidden(added.id, true);
    expect((await r.list()).find((b) => b.id === added.id)?.hidden).toBe(true);
    await r.remove(added.id);
    expect((await r.list()).map((b) => b.id)).toEqual([found.id]);
    expect(events.filter((e) => (e as { type: string }).type === 'browsers-changed').length).toBeGreaterThanOrEqual(3);
    await expect(r.remove(found.id)).rejects.toThrow('Only a browser you added');
    await expect(r.add(join(tmp, 'missing'))).rejects.toThrow("isn't there");
    const plain = join(tmp, 'not-executable');
    writeFileSync(plain, '');
    await expect(r.add(plain)).rejects.toThrow("can't be run");
    await expect(r.add(tmp)).rejects.toThrow("isn't a program");
  });
});

describe('Driving a Chromium browser', () => {
  const chrome = (command: string[], urlAt = command.length, extra: Partial<FoundBrowser> = {}): FoundBrowser => ({
    id: 'desktop:google-chrome.desktop',
    name: 'Google Chrome',
    engine: 'chromium',
    command,
    urlAt,
    iconFile: null,
    app: null,
    program: command[0],
    added: false,
    ...extra,
  });
  const flags = ['--user-data-dir=/p', '--remote-debugging-port=0'];

  it('puts its flags and address where the browser takes them', () => {
    expect(driveCommand(chrome(['/usr/bin/google-chrome', '--incognito']), flags, 'about:blank')).toEqual(['/usr/bin/google-chrome', '--incognito', ...flags, 'about:blank']);
    // A launcher's address in the middle stays in the middle.
    expect(driveCommand(chrome(['/usr/bin/chrome', '--x'], 1), flags, 'about:blank')).toEqual(['/usr/bin/chrome', ...flags, 'about:blank', '--x']);
    // Flatpak: before its forwarded-file markers, which go.
    expect(driveCommand(chrome(['/usr/bin/flatpak', 'run', 'org.chromium.Chromium', '@@u', '@@'], 3), flags, 'about:blank')).toEqual(['/usr/bin/flatpak', 'run', 'org.chromium.Chromium', ...flags, 'about:blank']);
    // macOS: a new instance of the app, the flags after --args.
    expect(driveCommand(chrome(['open', '-a', '/Applications/Google Chrome.app']), flags, 'about:blank')).toEqual(['open', '-n', '-a', '/Applications/Google Chrome.app', '--args', ...flags, 'about:blank']);
  });

  it("keeps its profile in the app's data, or where a Snap's or Flatpak's sandbox lets it write", () => {
    expect(profileDir(chrome(['/usr/bin/google-chrome']), '/data')).toBe('/data/browsers/desktop_google-chrome.desktop');
    expect(profileDir(chrome(['/snap/bin/chromium']), '/data')).toMatch(/\/snap\/chromium\/common\/console-editor-profile$/);
    expect(profileDir(chrome(['/usr/bin/flatpak', 'run', '--branch=stable', 'org.chromium.Chromium'], 4), '/data')).toMatch(/\/\.var\/app\/org\.chromium\.Chromium\/data\/console-editor-profile$/);
  });

  it('reads the address of its debugging port from its profile, once written', async () => {
    const dir = join(tmp, 'profile');
    mkdirSync(dir, { recursive: true });
    expect(await readActivePort(dir)).toBeNull();
    writeFileSync(join(dir, 'DevToolsActivePort'), '9333\n/devtools/browser/abc\n');
    expect(await readActivePort(dir)).toBe('ws://127.0.0.1:9333/devtools/browser/abc');
    writeFileSync(join(dir, 'DevToolsActivePort'), '9333');
    expect(await readActivePort(dir)).toBeNull();
  });

  it('keeps its tabs: their changes, the one showing an address, a blank one to reuse, and the one a new target becomes', async () => {
    const tabs = new DrivenTabs<DrivenTabState>();
    const tab = (id: string, url: string) => ({ info: { id, title: '', url }, sessionId: `s-${id}` }) as DrivenTabState;
    tabs.add(tab('a', 'about:blank'));
    expect(tabs.blank()?.info.id).toBe('a');
    expect(tabs.update('a', { url: 'https://shop.test/', title: 'Shop' })).toBe(true);
    expect(tabs.update('a', { url: 'https://shop.test/', title: 'Shop' })).toBe(false);
    expect(tabs.update('a', { title: 'Shop' })).toBe(false);
    expect(tabs.update('gone', { url: 'x', title: 'y' })).toBe(false);
    expect(tabs.blank()).toBeUndefined();
    const arriving = tabs.arrival('b');
    tabs.add(tab('b', 'about:blank'));
    expect((await arriving).info.id).toBe('b');
    expect(tabs.list()).toEqual([{ id: 'a', title: 'Shop', url: 'https://shop.test/' }, { id: 'b', title: '', url: 'about:blank' }]);
    expect(tabs.showing('https://shop.test/')?.info.id).toBe('a');
    expect(tabs.remove('a')?.info.id).toBe('a');
    expect(() => tabs.get('a')).toThrow('That tab is closed');
    expect(tabs.clear().map((t) => t.info.id)).toEqual(['b']);
  });
});
