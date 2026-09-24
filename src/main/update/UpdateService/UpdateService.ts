import { VERSION_TAG_PREFIX } from '../../../shared/changelog';
import type { AppInfo, AvailableUpdate, UpdateState } from '../../../shared/types';
import { isNewerVersion } from '../../../shared/version';
import { CheckTimer } from './CheckTimer';
import { FIRST_CHECK_MS } from './constants';
import { downloadManually } from './downloadManually';
import { downloadWithInstaller } from './downloadWithInstaller';
import { errorMessage } from './errorMessage';
import { failedCheckState } from './failedCheckState';
import { fetchLatestRelease } from './fetchLatestRelease';
import { fetchNotes } from './fetchNotes';
import { offeredUpdate } from './offeredUpdate';
import { OneAtATime } from './OneAtATime';
import { pendingUpdate } from './pendingUpdate';
import { readAppInfo } from './readAppInfo';
import type { AutoInstaller, GitHubRelease, UpdateServiceOptions } from './types';

/**
 * Checks GitHub for a newer release, downloads it and installs it. Automatic
 * checks are quiet: a failure (offline, rate limit) leaves the state as it
 * was, and only a manual check reports it.
 */
export class UpdateService {
  private current: UpdateState;
  private release: GitHubRelease | null = null;
  private readonly timer = new CheckTimer(() => this.check(false), () => this.opts.enabled && this.opts.autoCheck());
  private installer: Promise<AutoInstaller | null> | null = null;
  private info: Promise<AppInfo> | null = null;
  /** One download or install at a time. */
  private readonly steps = new OneAtATime();

  constructor(private readonly opts: UpdateServiceOptions) {
    this.current = opts.enabled ? { status: 'idle' } : { status: 'disabled' };
  }

  state(): UpdateState {
    return this.current;
  }

  /** The running version, and the one before it when the app was just updated. Recorded once per run. */
  appInfo(): Promise<AppInfo> {
    this.info ??= readAppInfo(this.opts);
    return this.info;
  }

  /** Starts (or, after the setting changed, restarts or stops) the automatic checks. */
  schedule(delay = FIRST_CHECK_MS): void {
    this.timer.schedule(delay);
  }

  dispose(): void {
    this.timer.stop();
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
      const release = await fetchLatestRelease(this.opts);
      if (superseded()) return this.current;
      const version = release.tag_name.replace(VERSION_TAG_PREFIX, '');
      if (!isNewerVersion(version, this.opts.currentVersion)) return this.set({ status: 'up-to-date', version: this.opts.currentVersion });
      const offered = pendingUpdate(before);
      // Offered already: keep its notes, unless they couldn't be fetched then.
      if (offered?.version === version && offered.notes && before.status === 'available') {
        this.release = release;
        return this.set(before);
      }
      const [notes, installer] = await Promise.all([fetchNotes(this.opts, version), this.autoInstaller()]);
      if (superseded()) return this.current;
      // Kept with the offer: a manual download takes its file from this release.
      this.release = release;
      return this.set({ status: 'available', update: offeredUpdate(release, version, notes, offered, installer) });
    } catch (err) {
      return superseded() ? this.current : this.set(failedCheckState(before, manual, err));
    }
  }

  /** Downloads the available update: to the installer's cache (auto) or to Downloads, checked against the release's SHA-256 sums (manual). */
  download(): Promise<void> {
    return this.steps.run(async () => {
      const update = pendingUpdate(this.current);
      if (!update || this.current.status === 'downloading' || this.current.status === 'ready') return;
      this.set({ status: 'downloading', update, percent: 0 });
      try {
        const installer = update.install === 'auto' ? await this.autoInstaller() : null;
        if (installer) {
          await downloadWithInstaller(installer, (percent) => this.progress(update, percent));
          this.set({ status: 'ready', update });
        } else {
          const file = await downloadManually(this.release, update, this.opts, (percent) => this.progress(update, percent));
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
    return this.steps.run(async () => {
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
}
