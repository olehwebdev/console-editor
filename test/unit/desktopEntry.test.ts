import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const electron = vi.hoisted(() => ({ app: { isPackaged: true } }));
/** Commands that exit 0; any other fails, as `dpkg-query -S` does for a file no package owns. */
const owners = vi.hoisted(() => new Set<string>());

vi.mock('electron', () => electron);
vi.mock('electron-updater', () => ({ AppImageUpdater: class {}, DebUpdater: class {}, NsisUpdater: class {}, RpmUpdater: class {} }));
vi.mock('node:child_process', () => ({
  execFile: (command: string, _args: string[], _opts: unknown, done: (err: Error | null) => void) =>
    done(owners.has(command) ? null : new Error(`${command}: not owned`)),
}));

const { desktopEntryText, installDesktopEntry, integrateWithDesktop } = await import('../../src/main/desktopEntry');
const { LINUX_APP_NAME, LINUX_CATEGORY, LINUX_ICONS_RESOURCE } = await import('../../src/main/appInfo');

const root = resolve(__dirname, '../..');
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'console-editor-desktop-')));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** Parses a desktop entry's keys (one group, no localized keys). */
function keys(text: string): Record<string, string> {
  return Object.fromEntries(
    text
      .split('\n')
      .filter((line) => line.includes('='))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
  );
}

let run = 0;
/** A fresh data folder and a folder of bundled icons, as the package has them. */
function fixture(sizes = ['16x16', '48x48', '512x512']) {
  const dir = join(tmp, `run-${++run}`);
  const bundledIcons = join(dir, 'resources', LINUX_ICONS_RESOURCE);
  mkdirSync(bundledIcons, { recursive: true });
  for (const size of sizes) writeFileSync(join(bundledIcons, `${size}.png`), `png ${size}`);
  // Not an icon: left out.
  writeFileSync(join(bundledIcons, 'README.txt'), 'notes');
  return { dir, bundledIcons, dataHome: join(dir, 'share') };
}

const entryFile = (dataHome: string) => join(dataHome, 'applications', `${LINUX_APP_NAME}.desktop`);
const iconFile = (dataHome: string, size: string) => join(dataHome, 'icons/hicolor', size, 'apps', `${LINUX_APP_NAME}.png`);

describe('desktopEntryText', () => {
  it('starts the launcher with the URLs it is handed, under the icon and window class the app uses', () => {
    const entry = keys(desktopEntryText('/home/me/Apps/console-editor-0.3.0-linux-x86_64.AppImage')!);
    expect(entry).toMatchObject({
      Type: 'Application',
      Name: 'Console Editor',
      Exec: '"/home/me/Apps/console-editor-0.3.0-linux-x86_64.AppImage" %U',
      TryExec: '/home/me/Apps/console-editor-0.3.0-linux-x86_64.AppImage',
      Icon: LINUX_APP_NAME,
      StartupWMClass: LINUX_APP_NAME,
      Categories: `${LINUX_CATEGORY};`,
      // Marks it as the app's own, the only kind it ever removes.
      'X-Console-Editor-Self-Installed': 'true',
    });
  });

  it('keeps spaces, quotes, shell characters, backslashes and percent signs in the path literal', () => {
    const entry = keys(desktopEntryText('/home/me/My "Apps"/$HOME `x` 100%\\a.AppImage')!);
    // Quoted-argument escapes (" ` $ \), %% for a literal %, then the string type's \\ for each backslash.
    expect(entry.Exec).toBe('"/home/me/My \\\\"Apps\\\\"/\\\\$HOME \\\\`x\\\\` 100%%\\\\\\\\a.AppImage" %U');
    expect(entry.TryExec).toBe('/home/me/My "Apps"/$HOME `x` 100%\\\\a.AppImage');
  });

  it("writes no entry for a path with a line break, which would end the key", () => {
    expect(desktopEntryText('/home/me/a\nExec=evil')).toBeNull();
  });

  it("matches package.json's desktopName, which names the windows' class and app id", () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { desktopName: string };
    expect(pkg.desktopName).toBe(`${LINUX_APP_NAME}.desktop`);
  });
});

describe('installDesktopEntry', () => {
  it('installs every bundled icon size and an entry that starts the launcher', async () => {
    const { bundledIcons, dataHome } = fixture();
    expect(await installDesktopEntry({ launcher: '/apps/a.AppImage', bundledIcons, dataHome })).toBe(true);
    expect(keys(readFileSync(entryFile(dataHome), 'utf8')).Exec).toBe('"/apps/a.AppImage" %U');
    for (const size of ['16x16', '48x48', '512x512']) expect(readFileSync(iconFile(dataHome, size), 'utf8')).toBe(`png ${size}`);
    expect((await readdir(join(dataHome, 'icons/hicolor'))).sort()).toEqual(['16x16', '48x48', '512x512']);
    // No temp files left behind.
    expect(await readdir(join(dataHome, 'applications'))).toEqual([`${LINUX_APP_NAME}.desktop`]);
  });

  it('writes nothing when nothing changed, so a start leaves the files and the icon theme alone', async () => {
    const { bundledIcons, dataHome } = fixture();
    await installDesktopEntry({ launcher: '/apps/a.AppImage', bundledIcons, dataHome });
    const past = new Date('2026-01-01T00:00:00Z');
    for (const file of [entryFile(dataHome), iconFile(dataHome, '48x48'), join(dataHome, 'icons/hicolor')]) utimesSync(file, past, past);

    expect(await installDesktopEntry({ launcher: '/apps/a.AppImage', bundledIcons, dataHome })).toBe(false);
    for (const file of [entryFile(dataHome), iconFile(dataHome, '48x48'), join(dataHome, 'icons/hicolor')]) {
      expect(statSync(file).mtime).toEqual(past);
    }
  });

  it('follows the AppImage an update renamed, and takes the new version’s icon, marking the theme changed', async () => {
    const { bundledIcons, dataHome } = fixture();
    await installDesktopEntry({ launcher: '/apps/console-editor-0.2.0-linux-x86_64.AppImage', bundledIcons, dataHome });
    const past = new Date('2026-01-01T00:00:00Z');
    utimesSync(join(dataHome, 'icons/hicolor'), past, past);

    writeFileSync(join(bundledIcons, '48x48.png'), 'new png 48x48');
    const launcher = '/apps/console-editor-0.3.0-linux-x86_64.AppImage';
    expect(await installDesktopEntry({ launcher, bundledIcons, dataHome })).toBe(true);
    expect(keys(readFileSync(entryFile(dataHome), 'utf8')).TryExec).toBe(launcher);
    expect(readFileSync(iconFile(dataHome, '48x48'), 'utf8')).toBe('new png 48x48');
    expect(statSync(join(dataHome, 'icons/hicolor')).mtime.getTime()).toBeGreaterThan(past.getTime());
  });
});

describe('integrateWithDesktop', () => {
  const env = { ...process.env };
  const execPath = process.execPath;
  const platform = process.platform;
  const resourcesPath = (process as { resourcesPath?: string }).resourcesPath;

  /**
   * A packaged copy on `os` whose executable is `exe`, with its resources, a data folder of its own, and system data
   * folders (where packages install) with no entry of the app's unless `packaged`.
   */
  function copy(os: NodeJS.Platform, exe: string, vars: Record<string, string> = {}, packaged = false) {
    const { dir, dataHome } = fixture();
    const system = join(dir, 'system');
    mkdirSync(join(system, 'applications'), { recursive: true });
    if (packaged) writeFileSync(join(system, 'applications', `${LINUX_APP_NAME}.desktop`), '[Desktop Entry]\nName=Console Editor\n');
    Object.defineProperty(process, 'platform', { value: os });
    Object.defineProperty(process, 'execPath', { value: exe });
    Object.defineProperty(process, 'resourcesPath', { value: join(dir, 'resources'), configurable: true });
    delete process.env.APPIMAGE;
    delete process.env.APPDIR;
    Object.assign(process.env, { XDG_DATA_HOME: dataHome, XDG_DATA_DIRS: `relative/ignored:${system}` }, vars);
    return dataHome;
  }

  /** An entry and icons the app installed earlier, as an AppImage. */
  async function installedBefore(dataHome: string) {
    const { bundledIcons } = fixture();
    await installDesktopEntry({ launcher: '/home/me/Apps/old.AppImage', bundledIcons, dataHome });
  }

  beforeEach(() => {
    electron.app.isPackaged = true;
    owners.clear();
  });

  afterEach(() => {
    process.env = { ...env };
    Object.defineProperty(process, 'platform', { value: platform });
    Object.defineProperty(process, 'execPath', { value: execPath });
    Object.defineProperty(process, 'resourcesPath', { value: resourcesPath, configurable: true });
  });

  it('points the entry at the AppImage, not at the folder the runtime mounted it in for this run', async () => {
    const appDir = join(tmp, '.mount_consolXyZ');
    mkdirSync(appDir, { recursive: true });
    const dataHome = copy('linux', join(appDir, 'console-editor'), { APPIMAGE: '/home/me/Apps/console-editor.AppImage', APPDIR: appDir });
    await integrateWithDesktop();
    expect(keys(readFileSync(entryFile(dataHome), 'utf8')).TryExec).toBe('/home/me/Apps/console-editor.AppImage');
    expect(readFileSync(iconFile(dataHome, '512x512'), 'utf8')).toBe('png 512x512');
  });

  it('points it at the executable of an unpacked .tar.gz', async () => {
    const dataHome = copy('linux', '/home/me/console-editor-0.3.0/console-editor');
    await integrateWithDesktop();
    expect(keys(readFileSync(entryFile(dataHome), 'utf8')).TryExec).toBe('/home/me/console-editor-0.3.0/console-editor');
  });

  it('leaves the .deb and .rpm to the entry their package installs', async () => {
    for (const manager of ['dpkg-query', 'rpm']) {
      owners.clear();
      owners.add(manager);
      const dataHome = copy('linux', '/opt/Console Editor/console-editor', {}, true);
      await integrateWithDesktop();
      expect(() => statSync(dataHome)).toThrow();
    }
  });

  it('removes the entry and icons an AppImage installed, once the .deb is what runs: they would shadow its own', async () => {
    owners.add('dpkg-query');
    const dataHome = copy('linux', '/opt/Console Editor/console-editor', {}, true);
    await installedBefore(dataHome);
    const past = new Date('2026-01-01T00:00:00Z');
    utimesSync(join(dataHome, 'icons/hicolor'), past, past);

    await integrateWithDesktop();
    expect(() => statSync(entryFile(dataHome))).toThrow();
    for (const size of ['16x16', '48x48', '512x512']) expect(() => statSync(iconFile(dataHome, size))).toThrow();
    expect(statSync(join(dataHome, 'icons/hicolor')).mtime.getTime()).toBeGreaterThan(past.getTime());
  });

  it("never removes an entry it didn't install", async () => {
    owners.add('dpkg-query');
    const dataHome = copy('linux', '/opt/Console Editor/console-editor', {}, true);
    mkdirSync(join(dataHome, 'applications'), { recursive: true });
    const mine = '[Desktop Entry]\nName=My own launcher\nExec=/opt/Console Editor/console-editor --flag\n';
    writeFileSync(entryFile(dataHome), mine);
    await integrateWithDesktop();
    expect(readFileSync(entryFile(dataHome), 'utf8')).toBe(mine);
  });

  it('leaves the desktop to an installed .deb or .rpm when an AppImage runs beside it, removing its own old entry', async () => {
    const appDir = join(tmp, '.mount_consolAbC');
    mkdirSync(appDir, { recursive: true });
    const vars = { APPIMAGE: '/home/me/Apps/console-editor.AppImage', APPDIR: appDir };
    const dataHome = copy('linux', join(appDir, 'console-editor'), vars, true);
    await installedBefore(dataHome);
    await integrateWithDesktop();
    expect(() => statSync(entryFile(dataHome))).toThrow();
    expect(() => statSync(iconFile(dataHome, '48x48'))).toThrow();
  });

  it('does nothing for a build run from source, or on other systems', async () => {
    let dataHome = copy('linux', '/usr/lib/electron/electron');
    electron.app.isPackaged = false;
    await integrateWithDesktop();
    expect(() => statSync(dataHome)).toThrow();

    electron.app.isPackaged = true;
    for (const os of ['darwin', 'win32'] as const) {
      dataHome = copy(os, '/Applications/Console Editor.app/Contents/MacOS/Console Editor');
      await integrateWithDesktop();
      expect(() => statSync(dataHome)).toThrow();
    }
  });
});
