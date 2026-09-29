import { rm } from 'node:fs/promises';
import { PROGRESS_EVERY_MS, WEBKIT_ID } from './constants';
import { installWebKit } from './installWebKit';
import { isInstalled } from './isInstalled';
import type { BuiltBrowser, WebKitBuild, WebKitDownloadDeps } from './types';
import { webkitBrowser } from './webkitBrowser';
import { webkitBuild } from './webkitBuild';

/**
 * Playwright's WebKit build, listed as a browser of its own (downloaded or not), downloaded into the data folder when
 * asked (once at a time, its progress announced as `browser-download`) and removed again.
 */
export class WebKitDownload {
  private build: Promise<WebKitBuild> | null = null;
  private downloading: Promise<void> | null = null;

  constructor(private readonly deps: WebKitDownloadDeps) {}

  /** The build as a browser, or none where Playwright has none for this system. */
  async list(): Promise<BuiltBrowser[]> {
    const build = await this.find().catch(() => null);
    return build ? [{ browser: webkitBrowser(build), version: build.version, downloaded: await isInstalled(build) }] : [];
  }

  download(): Promise<void> {
    this.downloading ??= this.find()
      .then(async (build) => {
        if (await isInstalled(build)) return;
        let said = 0;
        await installWebKit(build, (done, total) => {
          if (Date.now() - said < PROGRESS_EVERY_MS && done !== total) return;
          said = Date.now();
          this.deps.send({ type: 'browser-download', id: WEBKIT_ID, done, total });
        });
      })
      .finally(() => {
        this.downloading = null;
        this.deps.changed();
      });
    return this.downloading;
  }

  async remove(): Promise<void> {
    if (this.downloading) throw new Error('WebKit is still downloading');
    await rm((await this.find()).directory, { recursive: true, force: true });
    this.deps.changed();
  }

  private find(): Promise<WebKitBuild> {
    this.build ??= webkitBuild(this.deps.dir);
    return this.build;
  }
}
