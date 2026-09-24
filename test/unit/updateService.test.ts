import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AutoInstaller,
  CHECK_INTERVAL_MS,
  FIRST_CHECK_MS,
  manualAssetName,
  UpdateService,
  type UpdateServiceOptions,
} from '../../src/main/update/UpdateService';
import type { UpdateState } from '../../src/shared/types';

const API = 'https://api.test/releases/latest';
const DMG = 'console-editor-0.2.0-mac-arm64.dmg';
const DMG_BYTES = Buffer.alloc(300_000, 7);
const CHANGELOG = `# Changelog\n\n## [0.2.0] - 2026-10-01\n\n### Added\n\n- Updates.\n\n## [0.1.0] - 2026-09-24\n\nFirst.\n`;

let dir: string;
let routes: Map<string, () => Response>;
let sent: UpdateState[];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'console-editor-updates-'));
  sent = [];
  const sums = `${createHash('sha256').update(DMG_BYTES).digest('hex')}  ${DMG}\n${'0'.repeat(64)}  other.exe\n`;
  routes = new Map([
    [API, () => Response.json(release('v0.2.0'))],
    ['https://raw.test/v0.2.0/CHANGELOG.md', () => new Response(CHANGELOG)],
    [`https://dl.test/${DMG}`, () => new Response(chunked(DMG_BYTES, 3), { headers: { 'content-length': String(DMG_BYTES.length) } })],
    ['https://dl.test/SHA256SUMS.txt', () => new Response(sums)],
  ]);
});

afterEach(async () => {
  vi.useRealTimers();
  await rm(dir, { recursive: true, force: true });
});

/** A body that arrives in parts, as a download does. */
function chunked(bytes: Buffer, parts: number): ReadableStream<Uint8Array> {
  const size = Math.ceil(bytes.length / parts);
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(new Uint8Array(bytes.subarray(offset, (offset += size))));
    },
  });
}

function release(tag: string) {
  return {
    tag_name: tag,
    html_url: `https://github.test/releases/${tag}`,
    assets: [DMG, 'SHA256SUMS.txt'].map((name) => ({ name, browser_download_url: `https://dl.test/${name}`, size: name === DMG ? DMG_BYTES.length : 100 })),
  };
}

function fakeInstaller(overrides: Partial<AutoInstaller> = {}): AutoInstaller {
  return {
    check: vi.fn(async () => '0.2.0'),
    download: vi.fn(async (onProgress: (percent: number) => void) => {
      onProgress(10.4);
      onProgress(10.9);
      onProgress(55);
      onProgress(100);
    }),
    quitAndInstall: vi.fn(),
    ...overrides,
  };
}

function service(opts: Partial<UpdateServiceOptions> = {}): UpdateService {
  return new UpdateService({
    currentVersion: '0.1.0',
    platform: 'darwin',
    arch: 'arm64',
    enabled: true,
    endpoints: { latestRelease: API, changelog: (v) => `https://raw.test/v${v}/CHANGELOG.md` },
    fetch: vi.fn(async (url: string) => routes.get(url)?.() ?? new Response('not found', { status: 404 })),
    autoInstaller: async () => null,
    downloadsDir: join(dir, 'downloads'),
    stateFile: join(dir, 'update.json'),
    unrecordedVersion: null,
    autoCheck: () => true,
    send: (state) => sent.push(state),
    prepareToQuit: async () => true,
    cancelQuit: vi.fn(),
    showFile: vi.fn(async () => {}),
    ...opts,
  });
}

describe('UpdateService.check', () => {
  it('finds a newer release, with its notes from the tag’s CHANGELOG', async () => {
    const updates = service();
    const state = await updates.check(true);
    expect(state).toEqual({
      status: 'available',
      update: { version: '0.2.0', notes: '### Added\n\n- Updates.', releaseUrl: 'https://github.test/releases/v0.2.0', install: 'manual' },
    });
    expect(sent.map((s) => s.status)).toEqual(['checking', 'available']);
  });

  it('offers to install it when this copy can update itself', async () => {
    const state = await service({ autoInstaller: async () => fakeInstaller() }).check(false);
    expect(state.status === 'available' && state.update.install).toBe('auto');
  });

  it('says it is up to date when the latest release is this version or older', async () => {
    routes.set(API, () => Response.json(release('v0.1.0')));
    expect(await service().check(true)).toEqual({ status: 'up-to-date', version: '0.1.0' });
  });

  it('keeps automatic checks quiet when they fail, and reports manual ones', async () => {
    routes.set(API, () => new Response('slow down', { status: 403 }));
    const updates = service();
    expect(await updates.check(false)).toEqual({ status: 'idle' });
    expect(await updates.check(true)).toEqual({ status: 'error', during: 'check', message: "Couldn't check for updates: GitHub is limiting requests, try again later" });
  });

  it('keeps an offered update when a later check fails', async () => {
    const updates = service();
    const offered = await updates.check(false);
    routes.set(API, () => {
      throw new TypeError('fetch failed');
    });
    expect(await updates.check(false)).toEqual(offered);
    expect(await updates.check(true)).toEqual({
      status: 'error',
      during: 'check',
      message: "Couldn't check for updates: fetch failed",
      update: offered.status === 'available' ? offered.update : undefined,
    });
    // It can still be downloaded.
    await updates.download();
    expect(updates.state().status).toBe('ready');
  });

  it('offers the update without notes when the CHANGELOG has none for it, and fetches them again later', async () => {
    const changelog = routes.get('https://raw.test/v0.2.0/CHANGELOG.md')!;
    routes.delete('https://raw.test/v0.2.0/CHANGELOG.md');
    const updates = service();
    const state = await updates.check(true);
    expect(state.status === 'available' && state.update.notes).toBe('');
    routes.set('https://raw.test/v0.2.0/CHANGELOG.md', changelog);
    const again = await updates.check(false);
    expect(again.status === 'available' && again.update.notes).toBe('### Added\n\n- Updates.');
  });

  it('lets a newer check or a download win over a check that answers late', async () => {
    let answer!: () => void;
    const slow = new Promise<void>((done) => (answer = done));
    const fetch = vi.fn(async (url: string) => {
      if (url === API && fetch.mock.calls.length === 1) {
        await slow;
        throw new TypeError('fetch failed');
      }
      return routes.get(url)?.() ?? new Response('', { status: 404 });
    });
    const updates = service({ fetch, autoInstaller: async () => fakeInstaller() });
    const automatic = updates.check(false);
    const manual = await updates.check(true);
    expect(manual.status).toBe('available');
    answer();
    // The automatic check's failure would have put back the state from before it started (idle).
    expect(await automatic).toEqual(manual);
    expect(updates.state()).toEqual(manual);
  });

  it('rejects an answer that is not a release', async () => {
    routes.set(API, () => Response.json({ message: 'Not Found' }));
    expect(await service().check(true)).toMatchObject({ status: 'error', message: "Couldn't check for updates: unexpected answer from GitHub" });
  });

  it('does nothing in a build run from source', async () => {
    const fetch = vi.fn();
    const updates = service({ enabled: false, fetch });
    expect(updates.state()).toEqual({ status: 'disabled' });
    expect(await updates.check(true)).toEqual({ status: 'disabled' });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('UpdateService.download and install (installs itself)', () => {
  it('downloads with whole-percent progress, then restarts into the update once drafts are saved', async () => {
    const installer = fakeInstaller();
    const prepareToQuit = vi.fn(async () => true);
    const updates = service({ autoInstaller: async () => installer, prepareToQuit });
    await updates.check(false);
    await updates.download();
    expect(sent.filter((s) => s.status === 'downloading').map((s) => (s.status === 'downloading' ? s.percent : -1))).toEqual([0, 10, 55, 100]);
    expect(updates.state().status).toBe('ready');

    await updates.install();
    expect(prepareToQuit).toHaveBeenCalledOnce();
    expect(installer.quitAndInstall).toHaveBeenCalledOnce();
  });

  it('stays when the user keeps the window open', async () => {
    const installer = fakeInstaller();
    const updates = service({ autoInstaller: async () => installer, prepareToQuit: async () => false });
    await updates.check(false);
    await updates.download();
    await updates.install();
    expect(installer.quitAndInstall).not.toHaveBeenCalled();
    expect(updates.state().status).toBe('ready');
  });

  it('reports an install that failed (a refused password), and lets closing save drafts again', async () => {
    const installer = fakeInstaller({
      quitAndInstall: vi.fn(() => {
        throw new Error('pkexec: authentication dismissed');
      }),
    });
    const cancelQuit = vi.fn();
    const updates = service({ autoInstaller: async () => installer, cancelQuit });
    await updates.check(false);
    await updates.download();
    await updates.install();
    expect(cancelQuit).toHaveBeenCalledOnce();
    expect(updates.state()).toMatchObject({ status: 'error', during: 'install', message: "Couldn't install the update: pkexec: authentication dismissed", update: { version: '0.2.0' } });
  });

  it("reports an updater error by its first line, without the updater's stack trace and headers", async () => {
    const error = new Error('Cannot find channel "latest-linux.yml" update info: HttpError: 404 Not Found\n"method: GET url: https://x"\nHeaders: {}');
    const updates = service({ autoInstaller: async () => fakeInstaller({ check: vi.fn(async () => Promise.reject(error)) }) });
    await updates.check(false);
    await updates.download();
    expect(updates.state()).toMatchObject({ message: 'Couldn\'t download the update: Cannot find channel "latest-linux.yml" update info: HttpError: 404 Not Found' });
  });

  it('fails the download when the release has nothing for this system', async () => {
    const updates = service({ autoInstaller: async () => fakeInstaller({ check: vi.fn(async () => null) }) });
    await updates.check(false);
    await updates.download();
    expect(updates.state()).toMatchObject({ status: 'error', during: 'download', message: "Couldn't download the update: this release has no update for your system yet", update: { version: '0.2.0' } });
  });

  it('downloads once when asked twice, and a check leaves the download alone', async () => {
    let finish!: () => void;
    const installer = fakeInstaller({ download: vi.fn(() => new Promise<void>((done) => (finish = done))) });
    const updates = service({ autoInstaller: async () => installer });
    await updates.check(false);
    const first = updates.download();
    const second = updates.download();
    await vi.waitFor(() => expect(installer.download).toHaveBeenCalled());
    expect(await updates.check(true)).toMatchObject({ status: 'downloading' });
    finish();
    await Promise.all([first, second]);
    expect(installer.download).toHaveBeenCalledOnce();
    expect(await updates.check(true)).toMatchObject({ status: 'ready' });
  });

  it('asks how this copy was installed only once', async () => {
    const autoInstaller = vi.fn(async () => fakeInstaller());
    const updates = service({ autoInstaller });
    await updates.check(false);
    await updates.download();
    await updates.install();
    expect(autoInstaller).toHaveBeenCalledOnce();
  });
});

describe('UpdateService.download (you install it)', () => {
  it('saves the disk image to Downloads once its checksum matches, and shows it', async () => {
    const showFile = vi.fn(async () => {});
    const updates = service({ showFile });
    await updates.check(false);
    await updates.download();
    const file = join(dir, 'downloads', DMG);
    expect(updates.state()).toMatchObject({ status: 'ready', file });
    expect(await readFile(file)).toEqual(DMG_BYTES);
    expect(showFile).toHaveBeenCalledWith(file);
    expect(sent.some((s) => s.status === 'downloading' && s.percent > 0 && s.percent < 100)).toBe(true);

    await updates.install();
    expect(showFile).toHaveBeenCalledTimes(2);
  });

  it('keeps nothing of a download whose checksum is wrong', async () => {
    routes.set(`https://dl.test/${DMG}`, () => new Response(Buffer.alloc(DMG_BYTES.length, 8)));
    const showFile = vi.fn(async () => {});
    const updates = service({ showFile });
    await updates.check(false);
    await updates.download();
    expect(updates.state()).toMatchObject({ status: 'error', message: "Couldn't download the update: the file is damaged (its checksum does not match)" });
    expect(await readdir(join(dir, 'downloads'))).toEqual([]);
    expect(showFile).not.toHaveBeenCalled();
  });

  it("refuses a file the checksums don't list", async () => {
    routes.set('https://dl.test/SHA256SUMS.txt', () => new Response(`${'0'.repeat(64)}  other.exe\n`));
    const updates = service();
    await updates.check(false);
    await updates.download();
    expect(updates.state()).toMatchObject({ status: 'error', message: `Couldn't download the update: the checksums don't list ${DMG}` });
    expect(existsSync(join(dir, 'downloads', DMG))).toBe(false);
  });

  it('names the file for this system', () => {
    expect(manualAssetName('1.0.0', 'darwin', 'x64')).toBe('console-editor-1.0.0-mac-x64.dmg');
    expect(manualAssetName('1.0.0', 'win32', 'arm64')).toBe('console-editor-1.0.0-win-arm64-setup.exe');
    expect(manualAssetName('1.0.0', 'linux', 'x64')).toBe('console-editor-1.0.0-linux-x64.tar.gz');
  });
});

describe('UpdateService.appInfo', () => {
  it('tells an update apart from a first run, once', async () => {
    expect(await service({ currentVersion: '0.2.0' }).appInfo()).toEqual({ version: '0.2.0', updatedFrom: null });
    expect(await service({ currentVersion: '0.2.0' }).appInfo()).toEqual({ version: '0.2.0', updatedFrom: null });
    const updated = service({ currentVersion: '0.3.0' });
    expect(await updated.appInfo()).toEqual({ version: '0.3.0', updatedFrom: '0.2.0' });
    // Asked again in the same run (the window reloaded): still just updated.
    expect(await updated.appInfo()).toEqual({ version: '0.3.0', updatedFrom: '0.2.0' });
    expect(await service({ currentVersion: '0.3.0' }).appInfo()).toEqual({ version: '0.3.0', updatedFrom: null });
  });

  it('takes a data folder with no record for one from a version that kept none', async () => {
    expect(await service({ currentVersion: '0.2.0', unrecordedVersion: '0.1.0' }).appInfo()).toEqual({ version: '0.2.0', updatedFrom: '0.1.0' });
  });

  it("doesn't call an unreadable record an update", async () => {
    await writeFile(join(dir, 'update.json'), '{not json');
    expect(await service({ currentVersion: '0.2.0', unrecordedVersion: '0.1.0' }).appInfo()).toEqual({ version: '0.2.0', updatedFrom: null });
  });
});

describe('UpdateService.schedule', () => {
  it('checks shortly after start and then every few hours, while the setting is on', async () => {
    vi.useFakeTimers();
    let on = true;
    const fetch = vi.fn(async () => Response.json(release('v0.1.0')));
    const updates = service({ fetch, autoCheck: () => on });
    updates.schedule();
    await vi.advanceTimersByTimeAsync(FIRST_CHECK_MS - 1);
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS);
    expect(fetch).toHaveBeenCalledTimes(2);

    on = false;
    updates.schedule();
    await vi.advanceTimersByTimeAsync(CHECK_INTERVAL_MS * 3);
    expect(fetch).toHaveBeenCalledTimes(2);
    updates.dispose();
  });
});
