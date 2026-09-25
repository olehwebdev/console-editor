/**
 * Update test for an installed app: a local server stands in for GitHub with a
 * newer release, and the test updates the app the way a user would. It waits
 * for the notification, reads the release notes on the What's New page,
 * downloads the update and restarts into it, then checks that the new version
 * is the one installed and running.
 *
 *   node test/smoke/update.ts <installed executable> <folder with the newer release's files>
 *
 * The folder holds what electron-builder built for the newer version: its
 * installers and latest*.yml. The executable is the installed app on Windows,
 * the AppImage on Linux (updated in place), and the app inside the .app on
 * macOS, where updates are downloaded and checked rather than installed.
 *
 * An AppImage also installs its own desktop entry (in a data folder of the test's,
 * through XDG_DATA_HOME): the test checks it starts the old file before the update
 * and the renamed one after it.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, readdirSync, readFileSync, readlinkSync, statSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import type { Page } from 'playwright-core';
import { launchApp, waitFor, type RunningApp } from './lib.ts';

const [executableArg, releaseArg] = process.argv.slice(2);
if (!executableArg || !releaseArg) {
  console.error('Usage: node test/smoke/update.ts <installed executable> <folder with the newer release>');
  process.exit(1);
}
const executable = resolve(executableArg);
const releaseDir = resolve(releaseArg);
const files = readdirSync(releaseDir).filter((name) => statSync(join(releaseDir, name)).isFile());
const next = files.map((name) => /^console-editor[-_](\d+\.\d+\.\d+)[-_.]/.exec(name)?.[1]).find(Boolean);
if (!next) throw new Error(`No console-editor-<version>-… files in ${releaseDir}`);
const auto = process.platform !== 'darwin';
const NOTES = 'The release the update test installs.';

// --- A stand-in for GitHub: the releases API, the tag's CHANGELOG, and the release's files. ---

const sums = files.map((name) => `${createHash('sha256').update(readFileSync(join(releaseDir, name))).digest('hex')}  ${name}`).join('\n');
const downloads: string[] = [];

function serveFile(req: IncomingMessage, res: ServerResponse, path: string): void {
  const size = statSync(path).size;
  // Single byte ranges, for the updater's differential downloads.
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
  if (range) {
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' });
    createReadStream(path, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': size, 'Accept-Ranges': 'bytes' });
    createReadStream(path).pipe(res);
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', base);
  if (url.pathname === '/releases/latest') {
    const assets = [...files, 'SHA256SUMS.txt'].map((name) => ({
      name,
      browser_download_url: `${base}/download/${name}`,
      size: name === 'SHA256SUMS.txt' ? Buffer.byteLength(sums) : statSync(join(releaseDir, name)).size,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tag_name: `v${next}`, html_url: `${base}/release`, assets }));
  } else if (url.pathname === `/changelog/v${next}`) {
    res.end(`# Changelog\n\n## [${next}] - 2026-09-24\n\n### Added\n\n- ${NOTES}\n`);
  } else if (url.pathname === '/download/SHA256SUMS.txt') {
    res.end(sums);
  } else if (url.pathname.startsWith('/download/') && files.includes(decodeURIComponent(url.pathname.slice(10)))) {
    const name = decodeURIComponent(url.pathname.slice(10));
    if (!name.endsWith('.yml') && !name.endsWith('.blockmap')) downloads.push(`${name}${req.headers.range ? ` (${req.headers.range})` : ''}`);
    serveFile(req, res, join(releaseDir, name));
  } else {
    res.writeHead(404).end();
  }
});
await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

// A download left from an earlier run would be installed without asking the server.
const updaterCache =
  process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'console-editor-updater')
    : join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'console-editor-updater');
await rm(join(updaterCache, 'pending'), { recursive: true, force: true });

// --- Where a restarted app records its version. ---

const userData = await mkdtemp(join(tmpdir(), 'console-editor-update-'));
/** Where an AppImage installs its desktop entry and icons (instead of ~/.local/share). */
const xdgData = await mkdtemp(join(tmpdir(), 'console-editor-update-xdg-'));
const desktopEntry = join(xdgData, 'applications', 'console-editor.desktop');

/** The file the AppImage's desktop entry starts, once there is one. */
function desktopEntryTarget(): string | undefined {
  try {
    return /^TryExec=(.*)$/m.exec(readFileSync(desktopEntry, 'utf8'))?.[1];
  } catch {
    return undefined;
  }
}
/** The data folder the app uses without CONSOLE_EDITOR_USER_DATA: the Windows installer restarts it from Explorer, without this test's environment. */
const defaultUserData =
  process.platform === 'win32'
    ? join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Console Editor')
    : join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'Console Editor');

function recordedVersion(folder: string, after: number): string | undefined {
  const file = join(folder, 'update.json');
  try {
    if (statSync(file).mtimeMs < after) return undefined;
    return (JSON.parse(readFileSync(file, 'utf8')) as { lastVersion?: string }).lastVersion;
  } catch {
    return undefined;
  }
}

/** Ends the app the updater restarted: it has no debugging port to be closed through. */
function stopRestartedApp(folder: string): void {
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/F', '/T', '/IM', basename(executable)], { stdio: 'ignore' });
    } catch {
      // Already gone.
    }
    return;
  }
  // Chromium's lock names the process holding the data folder: "<host>-<pid>".
  try {
    const pid = Number(/-(\d+)$/.exec(readlinkSync(join(folder, 'SingletonLock')))?.[1]);
    if (pid) process.kill(pid);
  } catch {
    // Already gone.
  }
}

async function clickWhenVisible(page: Page, name: string, within = page.locator('body')): Promise<void> {
  await within.getByRole('button', { name, exact: true }).first().click({ timeout: 60_000 });
}

let running: RunningApp | undefined;
let failed = false;
let restartedIn: string | undefined;
try {
  const current = JSON.parse(await readFile(join(import.meta.dirname, '../../package.json'), 'utf8')).version as string;
  console.log(`Updating ${executable} (${current}) to ${next} from ${base}`);
  running = await launchApp(executable, { CONSOLE_EDITOR_USER_DATA: userData, CONSOLE_EDITOR_UPDATE_FEED: base, XDG_DATA_HOME: xdgData });
  const { editor } = running;
  if (executable.endsWith('.AppImage')) {
    await waitFor('the AppImage to install its desktop entry', () => desktopEntryTarget() === executable, 30_000);
    if (!existsSync(join(xdgData, 'icons/hicolor/512x512/apps/console-editor.png'))) throw new Error('The AppImage installed no icon');
  }

  // The first automatic check runs shortly after start and announces the release.
  const notifications = editor.locator('[aria-label="Notifications"]');
  await notifications.getByText(`Console Editor ${next} is available`).waitFor({ timeout: 90_000 });
  await clickWhenVisible(editor, "What's new", notifications);

  const card = editor.locator('[data-testid="update-card"]');
  await card.getByText(NOTES).waitFor({ timeout: 10_000 });
  await clickWhenVisible(editor, auto ? 'Download and install' : 'Download', card);

  const status = editor.locator('[data-testid="update-status"]');
  await status.getByText(auto ? 'Restart to update' : `${next} downloaded`).waitFor({ timeout: 300_000 });
  console.log(`Downloaded: ${downloads.join(', ') || '(nothing?)'}`);
  if (!downloads.length) throw new Error('The app never downloaded the update from the test server');

  if (!auto) {
    const file = join(userData, 'downloads', basename(files.find((name) => name.endsWith(`-mac-${process.arch}.dmg`))!));
    if (!existsSync(file)) throw new Error(`The disk image isn't at ${file}`);
    console.log(`Update OK on ${process.platform}-${process.arch}: ${next} was downloaded and checked (${file}).`);
  } else {
    const appImage = executable.endsWith('.AppImage') ? executable : undefined;
    const quitAt = Date.now();
    await status.click();
    await waitFor('the app to quit for the update', () => running!.exited(), 60_000);
    await running.browser.close().catch(() => undefined);
    running = undefined;

    // The installer (Windows) or the updater (AppImage) starts the new version, which records it.
    restartedIn = await waitFor(
      'the new version to start',
      () => [userData, defaultUserData].find((folder) => recordedVersion(folder, quitAt) === next),
      180_000,
    );
    console.log(`The updater restarted the app into ${next} (data folder ${restartedIn}).`);
    stopRestartedApp(restartedIn);
    await new Promise((r) => setTimeout(r, 3000));

    // The AppImage has the version in its name, so the new one sits beside where the old one was.
    let updated = executable;
    if (appImage) {
      // The updater names it after the release file for this architecture: the old name with the new version.
      updated = join(dirname(appImage), basename(appImage).replace(current, next));
      if (!existsSync(updated)) throw new Error(`No updated AppImage at ${updated}`);
      if (updated !== appImage && existsSync(appImage)) throw new Error(`The old AppImage is still at ${appImage}`);
    }

    // Started again by hand: it runs the new version, and opens What's New as on its first start after an update.
    // (Where the restart kept this test's data folder, that start already happened there, with no debugging port
    // to look at it: the record goes back to the old version so this start is the first one again.)
    if (restartedIn === userData) await writeFile(join(userData, 'update.json'), `${JSON.stringify({ lastVersion: current })}\n`);
    running = await launchApp(updated, { CONSOLE_EDITOR_USER_DATA: userData, CONSOLE_EDITOR_UPDATE_FEED: base, XDG_DATA_HOME: xdgData });
    const info = await running.editor.evaluate<{ version: string; updatedFrom: string | null }>('window.consoleEditor.getAppInfo()');
    if (info.version !== next) throw new Error(`The app runs ${info.version} after the update, not ${next}`);
    if (info.updatedFrom !== current) throw new Error(`Expected "updated from ${current}", got ${info.updatedFrom}`);
    await running.editor.locator('[data-testid="whats-new"]').getByText(`updated from ${current}`).waitFor({ timeout: 10_000 });
    // The desktop entry follows the AppImage the update renamed, so the launcher and the dock's icon keep working.
    if (appImage) await waitFor('the desktop entry to start the updated AppImage', () => desktopEntryTarget() === updated, 30_000);
    console.log(`Update OK on ${process.platform}-${process.arch}: ${current} → ${next}, installed and restarted.`);
  }
} catch (err) {
  failed = true;
  console.error(err);
  if (running) console.error(`--- app output ---\n${running.output().slice(-8000)}`);
} finally {
  await running?.browser.close().catch(() => undefined);
  running?.process.kill();
  if (restartedIn) stopRestartedApp(restartedIn);
  // The downloaded disk image was opened (mounted), as for a user.
  if (process.platform === 'darwin') {
    for (const volume of readdirSync('/Volumes').filter((name) => name.startsWith('Console Editor'))) {
      try {
        execFileSync('hdiutil', ['detach', '-force', join('/Volumes', volume)], { stdio: 'ignore' });
      } catch {
        // Not ours to worry about.
      }
    }
  }
  await new Promise((r) => setTimeout(r, 1000));
  server.closeAllConnections();
  server.close();
  await rm(userData, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }).catch(() => undefined);
  await rm(xdgData, { recursive: true, force: true }).catch(() => undefined);
}
process.exit(failed ? 1 : 0);
