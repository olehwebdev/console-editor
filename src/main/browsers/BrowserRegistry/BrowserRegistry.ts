import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { basename, extname } from 'node:path';
import type { BrowserInfo } from '../../../shared/types';
import { HTTP_URL } from '../../constants';
import { browserIcon } from '../browserIcon';
import { BROWSER_ID_PREFIX, SCAN_REUSE_MS } from '../constants';
import { engineOf } from '../engineOf';
import { findBrowsers } from '../findBrowsers';
import { readVersion } from '../readVersion';
import { reachableEveryday } from '../driven/everyday/reachableEveryday';
import { startBrowser } from '../startBrowser';
import type { BrowserRegistryDeps, FoundBrowser } from '../types';
import { addedBrowser } from './addedBrowser';
import { checkBrowserPath } from './checkBrowserPath';
import { infoOf } from './infoOf';

/** Bytes of an added browser's id. */
const ID_BYTES = 4;

/**
 * The browsers on this computer and the ones the user added: looked for at most once a minute, with their icons;
 * their versions are read one at a time afterwards and announced (`browsers-changed`) once all are in.
 */
export class BrowserRegistry {
  private found: FoundBrowser[] = [];
  private scannedAt = Number.NEGATIVE_INFINITY;
  private scanning: Promise<void> | undefined;
  private readingVersions = false;
  private readonly icons = new Map<string, string | null>();
  private readonly versions = new Map<string, string | null>();
  /** The browsers whose everyday profile ran with remote debugging on when they were last listed. */
  private debuggable = new Set<string>();

  constructor(private readonly deps: BrowserRegistryDeps) {}

  async list(): Promise<BrowserInfo[]> {
    await this.scan();
    const home = this.deps.home ?? homedir();
    const reachable = await Promise.all(this.all().map(async (b) => ((await reachableEveryday(b, home)) ? [b.id] : [])));
    this.debuggable = new Set(reachable.flat());
    return this.infos();
  }

  /** A browser by id, looked for again first when the last scan is old. */
  async get(id: string): Promise<FoundBrowser> {
    await this.scan();
    const browser = this.all().find((b) => b.id === id);
    if (!browser) throw new Error('That browser is no longer there');
    return browser;
  }

  /** Opens an http(s) address in a browser, with its everyday profile. */
  async open(id: string, url: string): Promise<void> {
    if (!HTTP_URL.test(url)) throw new Error('Only http(s) pages open in another browser');
    await startBrowser(await this.get(id), [url]);
  }

  /** Adds the program (or macOS app) at `path`, named after its file. */
  async add(path: string): Promise<BrowserInfo> {
    await checkBrowserPath(path);
    const name = basename(path, extname(path));
    const added = { id: `${BROWSER_ID_PREFIX.added}${randomBytes(ID_BYTES).toString('hex')}`, name, path, engine: engineOf([path, name]) };
    await this.deps.prefs.add(added);
    const browser = addedBrowser(added);
    this.icons.set(browser.id, await browserIcon(browser));
    this.changed();
    void this.readVersions();
    return infoOf(browser, this.icons.get(browser.id), null, new Set(), new Set());
  }

  async remove(id: string): Promise<void> {
    if (!this.deps.prefs.get().added.some((b) => b.id === id)) throw new Error('Only a browser you added can be removed');
    await this.deps.prefs.remove(id);
    this.changed();
  }

  async setHidden(id: string, hidden: boolean): Promise<void> {
    await this.deps.prefs.setHidden(id, hidden);
    this.changed();
  }

  private all(): FoundBrowser[] {
    return [...this.found, ...this.deps.prefs.get().added.map(addedBrowser)];
  }

  private infos(): BrowserInfo[] {
    const hidden = new Set(this.deps.prefs.get().hidden);
    return this.all().map((b) => infoOf(b, this.icons.get(b.id), this.versions.get(b.id), hidden, this.debuggable));
  }

  private changed(): void {
    this.deps.send({ type: 'browsers-changed', browsers: this.infos() });
  }

  private async scan(): Promise<void> {
    if (Date.now() - this.scannedAt < SCAN_REUSE_MS) return;
    this.scanning ??= (async () => {
      const found = (await (this.deps.find ?? findBrowsers)().catch((): FoundBrowser[] => [])).sort((a, b) => a.name.localeCompare(b.name));
      const all = [...found, ...this.deps.prefs.get().added.map(addedBrowser)];
      await Promise.all(all.filter((b) => !this.icons.has(b.id)).map(async (b) => this.icons.set(b.id, await browserIcon(b))));
      this.found = found;
      this.scannedAt = Date.now();
    })().finally(() => {
      this.scanning = undefined;
    });
    await this.scanning;
    void this.readVersions();
  }

  /** One at a time (a browser's program can be slow to start); announced once, when any was read. */
  private async readVersions(): Promise<void> {
    if (this.readingVersions) return;
    this.readingVersions = true;
    let read = false;
    try {
      for (let next = this.unversioned(); next; next = this.unversioned()) {
        this.versions.set(next.id, await readVersion(next));
        read = true;
      }
    } finally {
      this.readingVersions = false;
    }
    if (read) this.changed();
  }

  private unversioned(): FoundBrowser | undefined {
    return this.all().find((b) => !this.versions.has(b.id));
  }
}
