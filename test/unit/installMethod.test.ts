import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const electron = vi.hoisted(() => ({ app: { isPackaged: true } }));
/** Commands that exit 0; any other fails, as `dpkg-query -S` does for a file no package owns. */
const owners = vi.hoisted(() => new Set<string>());

vi.mock('electron', () => electron);
vi.mock('electron-updater', () => ({ AppImageUpdater: class {}, DebUpdater: class {}, NsisUpdater: class {}, RpmUpdater: class {} }));
vi.mock('node:child_process', () => ({
  execFile: (command: string, _args: string[], _opts: unknown, done: (err: Error | null) => void) =>
    done(owners.has(command) ? null : new Error(`${command}: not owned`)),
}));

const { detectInstallMethod } = await import('../../src/main/update/electronInstaller');

const env = { ...process.env };
const execPath = process.execPath;
const platform = process.platform;

function on(os: NodeJS.Platform, exe: string, vars: Record<string, string> = {}): void {
  Object.defineProperty(process, 'platform', { value: os });
  Object.defineProperty(process, 'execPath', { value: exe });
  delete process.env.APPIMAGE;
  delete process.env.APPDIR;
  Object.assign(process.env, vars);
}

beforeEach(() => {
  electron.app.isPackaged = true;
  owners.clear();
});

afterEach(() => {
  process.env = { ...env };
  Object.defineProperty(process, 'platform', { value: platform });
  Object.defineProperty(process, 'execPath', { value: execPath });
});

describe('detectInstallMethod', () => {
  it('installs updates itself on Windows, and never in a build run from source', async () => {
    on('win32', 'C:\\Users\\me\\AppData\\Local\\Programs\\Console Editor\\Console Editor.exe');
    expect(await detectInstallMethod()).toBe('nsis');
    electron.app.isPackaged = false;
    expect(await detectInstallMethod()).toBeNull();
  });

  it('leaves macOS to the user until builds are signed with a Developer ID', async () => {
    on('darwin', '/Applications/Console Editor.app/Contents/MacOS/Console Editor');
    expect(await detectInstallMethod()).toBeNull();
  });

  it('updates an AppImage it runs from', async () => {
    on('linux', '/tmp/.mount_consolXyZ/console-editor', { APPIMAGE: '/home/me/Apps/console-editor-0.2.0-linux-x86_64.AppImage', APPDIR: '/tmp/.mount_consolXyZ' });
    expect(await detectInstallMethod()).toBe('appimage');
  });

  it("ignores another AppImage's variables, inherited from its terminal", async () => {
    const cursor = { APPIMAGE: '/home/me/Apps/Cursor-1.5.0-x86_64.AppImage', APPDIR: '/tmp/.mount_CursorAbc' };
    on('linux', '/opt/Console Editor/console-editor', cursor);
    owners.add('dpkg-query');
    expect(await detectInstallMethod()).toBe('deb');
    owners.clear();
    expect(await detectInstallMethod()).toBeNull();
    // A mount whose name merely starts the same is someone else's too.
    on('linux', '/tmp/.mount_CursorAbcd/console-editor', cursor);
    expect(await detectInstallMethod()).toBeNull();
  });

  it('asks the package manager whether it installed the app', async () => {
    on('linux', '/opt/Console Editor/console-editor');
    owners.add('rpm');
    expect(await detectInstallMethod()).toBe('rpm');
    owners.clear();
    // The .tar.gz, unpacked anywhere.
    expect(await detectInstallMethod()).toBeNull();
  });
});
