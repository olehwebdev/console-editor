import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { changelogSection, VERSION_TAG_PREFIX } from '../../../shared/changelog';
import type { AppInfo, AvailableUpdate, UpdateState } from '../../../shared/types';
import { isNewerVersion } from '../../../shared/version';
import { FILE_NOT_FOUND, SHA256 } from '../../constants';
import { errorMessage } from './errorMessage';
import { manualAssetName } from './manualAssetName';
import { pendingUpdate } from './pendingUpdate';
import type { AutoInstaller, GitHubRelease, UpdateServiceOptions } from './types';

/** First automatic check after start, then the interval between checks. */
export const FIRST_CHECK_MS = 10_000;
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** How GitHub answers while it is limiting requests. */
const RATE_LIMITED_STATUSES = new Set([403, 429]);

/** The release's list of SHA-256 sums, that manual downloads are checked against. */
const CHECKSUMS_ASSET = 'SHA256SUMS.txt';

/** Added to a manual download's name until its checksum is right. */
const PARTIAL_DOWNLOAD_SUFFIX = '.download';

/** GitHub's media type for its REST API's JSON. */
const GITHUB_JSON = 'application/vnd.github+json';
const CONTENT_LENGTH_HEADER = 'content-length';
/** A SHA-256 sum in hex, as `sha256sum` writes it. */
const SHA256_HEX = /^[0-9a-f]{64}$/i;
/** What separates a sum from its file's name in `sha256sum` output: spaces, then `*` in binary mode. */
const SUM_SEPARATOR = /\s+\*?/;

/**
 * Checks GitHub for a newer release, downloads it and installs it. Automatic
 * checks are quiet: a failure (offline, rate limit) leaves the state as it
 * was, and only a manual check reports it.
 */
export class UpdateService {
  private current: UpdateState;
  private release: GitHubRelease | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private installer: Promise<AutoInstaller | null> | null = null;
  private info: Promise<AppInfo> | null = null;
  private busy: Promise<unknown> | null = null;

  constructor(private readonly opts: UpdateServiceOptions) {
    this.current = opts.enabled ? { status: 'idle' } : { status: 'disabled' };
  }

  state(): UpdateState {
    return this.current;
  }

  /** The running version, and the one before it when the app was just updated. Recorded once per run. */
  appInfo(): Promise<AppInfo> {
    this.info ??= (async () => {
      const version = this.opts.currentVersion;
      let last: unknown = null;
      try {
        last = (JSON.parse(await readFile(this.opts.stateFile, 'utf8')) as { lastVersion?: unknown }).lastVersion;
      } catch (err) {
        // No record yet: an update from a version that kept none, or a first run. An unreadable one: not an update.
        if ((err as NodeJS.ErrnoException).code === FILE_NOT_FOUND) last = this.opts.unrecordedVersion;
      }
      if (last !== version) {
        await mkdir(dirname(this.opts.stateFile), { recursive: true });
        await writeFile(this.opts.stateFile, `${JSON.stringify({ lastVersion: version })}\n`).catch(() => undefined);
      }
      return { version, updatedFrom: typeof last === 'string' && last !== version ? last : null };
    })();
    return this.info;
  }

  /** Starts (or, after the setting changed, restarts or stops) the automatic checks. */
  schedule(delay = FIRST_CHECK_MS): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.opts.enabled || !this.opts.autoCheck()) return;
    this.timer = setTimeout(() => {
      void this.check(false).finally(() => this.schedule(CHECK_INTERVAL_MS));
    }, delay);
  }

  dispose(): void {
    clearTimeout(this.timer);
  }

  /** Looks for a newer release. A manual check reports failures; an automatic one keeps quiet. */
  async check(manual: boolean): Promise<UpdateState> {
    if (!this.opts.enabled) return this.set({ status: 'disabled' });
    // Don't interrupt a download, or forget one that is ready.
    if (this.current.status === 'downloading' || this.current.status === 'ready') return this.current;
    const before = this.current;
    if (manual) this.set({ status: 'checking' });
    // Whatever changed the state while this check waited (another check, a download) is newer: keep it.
    const mine = this.current;
    const superseded = () => this.current !== mine;
    try {
      const release = await this.latestRelease();
      if (superseded()) return this.current;
      const version = release.tag_name.replace(VERSION_TAG_PREFIX, '');
      if (!isNewerVersion(version, this.opts.currentVersion)) return this.set({ status: 'up-to-date', version: this.opts.currentVersion });
      const offered = pendingUpdate(before);
      // Offered already: keep its notes, unless they couldn't be fetched then.
      if (offered?.version === version && offered.notes && before.status === 'available') {
        this.release = release;
        return this.set(before);
      }
      const [notes, installer] = await Promise.all([this.notes(version), this.autoInstaller()]);
      if (superseded()) return this.current;
      // Kept with the offer: a manual download takes its file from this release.
      this.release = release;
      return this.set({
        status: 'available',
        update: { version, notes: notes || (offered?.version === version ? offered.notes : ''), releaseUrl: release.html_url, install: installer ? 'auto' : 'manual', installsOnQuit: !!installer?.installsOnQuit },
      });
    } catch (err) {
      if (superseded()) return this.current;
      if (!manual) return this.set(before.status === 'checking' ? { status: 'idle' } : before);
      // An update found earlier stays on offer.
      const update = pendingUpdate(before);
      return this.set({ status: 'error', during: 'check', message: `Couldn't check for updates: ${errorMessage(err)}`, ...(update ? { update } : {}) });
    }
  }

  /** Downloads the available update: to the installer's cache (auto) or to Downloads, checked against the release's SHA-256 sums (manual). */
  download(): Promise<void> {
    return this.exclusive(async () => {
      const update = pendingUpdate(this.current);
      if (!update || this.current.status === 'downloading' || this.current.status === 'ready') return;
      this.set({ status: 'downloading', update, percent: 0 });
      try {
        const installer = update.install === 'auto' ? await this.autoInstaller() : null;
        if (installer) {
          const version = await installer.check();
          if (!version) throw new Error('this release has no update for your system yet');
          await installer.download((percent) => this.progress(update, percent));
          this.set({ status: 'ready', update });
        } else {
          const file = await this.downloadManually(update);
          this.set({ status: 'ready', update, file });
          await this.opts.showFile(file);
        }
      } catch (err) {
        this.set({ status: 'error', during: 'download', message: `Couldn't download the update: ${errorMessage(err)}`, update });
      }
    });
  }

  /** Restarts into the downloaded update (auto), or shows the downloaded file again (manual). */
  install(): Promise<void> {
    return this.exclusive(async () => {
      const state = this.current;
      if (state.status !== 'ready') return;
      if (state.update.install === 'manual') {
        if (state.file) await this.opts.showFile(state.file);
        return;
      }
      const installer = await this.autoInstaller();
      if (!installer || !(await this.opts.prepareToQuit())) return;
      try {
        installer.quitAndInstall();
      } catch (err) {
        this.opts.cancelQuit();
        this.set({ status: 'error', during: 'install', message: `Couldn't install the update: ${errorMessage(err)}`, update: state.update });
      }
    });
  }

  private autoInstaller(): Promise<AutoInstaller | null> {
    this.installer ??= this.opts.autoInstaller().catch(() => null);
    return this.installer;
  }

  private set(state: UpdateState): UpdateState {
    this.current = state;
    this.opts.send(state);
    return state;
  }

  /** Progress, sent once per whole percent. */
  private progress(update: AvailableUpdate, percent: number): void {
    const rounded = Math.max(0, Math.min(100, Math.floor(percent)));
    if (this.current.status === 'downloading' && this.current.percent === rounded) return;
    this.set({ status: 'downloading', update, percent: rounded });
  }

  /** One download or install at a time (a double click must not start two). */
  private async exclusive(task: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    const run = task();
    this.busy = run;
    try {
      await run;
    } finally {
      this.busy = null;
    }
  }

  private async latestRelease(): Promise<GitHubRelease> {
    const res = await this.opts.fetch(this.opts.endpoints.latestRelease, { headers: { Accept: GITHUB_JSON } });
    if (RATE_LIMITED_STATUSES.has(res.status)) throw new Error('GitHub is limiting requests, try again later');
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    const release = (await res.json()) as GitHubRelease;
    if (typeof release?.tag_name !== 'string' || !Array.isArray(release.assets)) throw new Error('unexpected answer from GitHub');
    return release;
  }

  /** The version's CHANGELOG section, read from the release's tag; '' when it can't be had. */
  private async notes(version: string): Promise<string> {
    try {
      const res = await this.opts.fetch(this.opts.endpoints.changelog(version));
      if (!res.ok) return '';
      return changelogSection(await res.text(), version)?.body ?? '';
    } catch {
      return '';
    }
  }

  private async downloadManually(update: AvailableUpdate): Promise<string> {
    const release = this.release;
    if (!release) throw new Error('check for updates again');
    const name = manualAssetName(update.version, this.opts.platform, this.opts.arch);
    const asset = release.assets.find((a) => a.name === name);
    const sums = release.assets.find((a) => a.name === CHECKSUMS_ASSET);
    if (!asset) throw new Error(`the release has no ${name}`);
    if (!sums) throw new Error("the release has no checksums to verify it with");
    const expected = await this.expectedHash(sums.browser_download_url, name);

    const target = join(this.opts.downloadsDir, name);
    const partial = `${target}${PARTIAL_DOWNLOAD_SUFFIX}`;
    await mkdir(this.opts.downloadsDir, { recursive: true });
    const res = await this.opts.fetch(asset.browser_download_url);
    if (!res.ok || !res.body) throw new Error(`GitHub answered ${res.status}`);
    const total = Number(res.headers.get(CONTENT_LENGTH_HEADER)) || asset.size;
    const hash = createHash(SHA256);
    let received = 0;
    // Written as it arrives, and renamed into place only once its checksum is right.
    const file = await open(partial, 'w');
    try {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        hash.update(value);
        await file.write(value);
        received += value.byteLength;
        if (total) this.progress(update, (received / total) * 100);
      }
      await file.close();
      if (hash.digest('hex') !== expected) throw new Error('the file is damaged (its checksum does not match)');
      await rename(partial, target);
    } catch (err) {
      await file.close().catch(() => undefined);
      await rm(partial, { force: true });
      throw err;
    }
    return target;
  }

  private async expectedHash(url: string, name: string): Promise<string> {
    const res = await this.opts.fetch(url);
    if (!res.ok) throw new Error(`couldn't read the checksums (${res.status})`);
    for (const line of (await res.text()).split('\n')) {
      const [hash, file] = line.trim().split(SUM_SEPARATOR);
      if (file === name && SHA256_HEX.test(hash)) return hash.toLowerCase();
    }
    throw new Error(`the checksums don't list ${name}`);
  }
}
