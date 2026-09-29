/**
 * The WebKit build the app downloads (Playwright's): where it goes and comes from, as the pinned playwright-core's
 * registry says; downloaded from a stand-in host with its progress, the next mirror tried when one fails, unpacked
 * with its program made runnable and its marker written last; nothing left of one that failed; and listed, downloaded
 * and removed as a browser of its own.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { installWebKit } from '../../src/main/browsers/webkit/installWebKit';
import { isInstalled } from '../../src/main/browsers/webkit/isInstalled';
import { WebKitDownload } from '../../src/main/browsers/webkit';
import { webkitBuild } from '../../src/main/browsers/webkit/webkitBuild';
import type { WebKitBuild } from '../../src/main/browsers/webkit/types';
import type { AppEvent } from '../../src/shared/types';
import { zipOf } from '../helpers/zipOf';

const tmp = mkdtempSync(join(tmpdir(), 'console-editor-webkit-'));

/** A zip holding a stand-in build: its program (not yet runnable) and a library. */
const buildZip = (program: string) =>
  zipOf([
    { name: program, data: Buffer.from('#!/bin/sh\nexit 1\n'), mode: 0o100644 },
    { name: 'lib/libwebkit.so', data: Buffer.alloc(200_000, 7) },
  ]);

describe('The WebKit build', () => {
  let server: Server;
  let host: string;
  let zip: Buffer;
  const asked: string[] = [];

  beforeAll(async () => {
    zip = await buildZip('pw_run.sh');
    server = createServer((req, res) => {
      asked.push(req.url!);
      if (req.url!.startsWith('/missing/')) return void res.writeHead(404).end();
      // Says it is longer than it is: cut short.
      if (req.url!.startsWith('/short/')) return void res.writeHead(200, { 'content-length': String(zip.length + 10) }).end(zip);
      res.writeHead(200, { 'content-length': String(zip.length) }).end(zip);
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    host = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    // Where the app's download of it comes from (read by Playwright's registry as it loads).
    process.env.PLAYWRIGHT_DOWNLOAD_HOST = host;
  });

  afterAll(async () => {
    delete process.env.PLAYWRIGHT_DOWNLOAD_HOST;
    await new Promise((r) => server.close(r));
    rmSync(tmp, { recursive: true, force: true });
  });

  const build = (name: string, urls: string[]): WebKitBuild => ({ directory: join(tmp, name, 'webkit-1'), executable: join(tmp, name, 'webkit-1', 'pw_run.sh'), urls, version: '26.6' });

  it("is where the pinned playwright-core's registry puts it, under the app's folder, and comes from its host", async () => {
    const found = await webkitBuild(join(tmp, 'builds'));
    const { revision, browserVersion } = (JSON.parse(readFileSync(join(__dirname, '../../node_modules/playwright-core/browsers.json'), 'utf8')) as { browsers: Array<{ name: string; revision: string; browserVersion: string }> }).browsers.find((b) => b.name === 'webkit')!;
    expect(dirname(found.directory)).toBe(join(tmp, 'builds'));
    expect(basename(found.directory)).toMatch(new RegExp(`^webkit-(${revision}|\\d+)$`));
    expect(found.executable.startsWith(found.directory)).toBe(true);
    expect(found.version).toBe(browserVersion);
    expect(found.urls).toEqual([expect.stringMatching(new RegExp(`^${host}/builds/webkit/\\d+/webkit-.+\\.zip$`))]);
  });

  it('is downloaded with its progress, unpacked, its program made runnable and its marker written last', async () => {
    const target = build('ok', [`${host}/missing/webkit.zip`, `${host}/builds/webkit.zip`]);
    const progress: Array<[number, number | null]> = [];
    await installWebKit(target, (done, total) => progress.push([done, total]));
    expect(progress.at(-1)).toEqual([zip.length, zip.length]);
    expect(asked.slice(-2)).toEqual(['/missing/webkit.zip', '/builds/webkit.zip']);
    expect(statSync(target.executable).mode & 0o777).toBe(0o755);
    expect(statSync(join(target.directory, 'lib/libwebkit.so')).size).toBe(200_000);
    expect(existsSync(join(target.directory, 'INSTALLATION_COMPLETE'))).toBe(true);
    expect(await isInstalled(target)).toBe(true);
  });

  it('leaves nothing of a download that failed, or was cut short', async () => {
    const missing = build('missing', [`${host}/missing/a.zip`, `${host}/missing/b.zip`]);
    await expect(installWebKit(missing, () => undefined)).rejects.toThrow('The download failed (404)');
    expect(existsSync(missing.directory)).toBe(false);
    const short = build('short', [`${host}/short/webkit.zip`]);
    await expect(installWebKit(short, () => undefined)).rejects.toThrow();
    expect(existsSync(short.directory)).toBe(false);
    expect(await isInstalled(short)).toBe(false);
  });

  it('is listed as a browser of its own, downloaded when asked (its progress announced), and removed', async () => {
    const events: AppEvent[] = [];
    let changes = 0;
    const webkit = new WebKitDownload({ dir: join(tmp, 'app'), send: (event) => events.push(event), changed: () => changes++ });
    const [listed] = await webkit.list();
    expect(listed).toMatchObject({ browser: { id: 'playwright:webkit', name: 'WebKit', engine: 'webkit', command: [] }, downloaded: false, version: expect.stringMatching(/^\d+\.\d+/) });
    await Promise.all([webkit.download(), webkit.download()]);
    expect(asked.filter((url) => url.startsWith('/builds/webkit/'))).toHaveLength(1);
    expect(events.at(-1)).toEqual({ type: 'browser-download', id: 'playwright:webkit', done: zip.length, total: zip.length });
    expect(changes).toBe(1);
    expect((await webkit.list())[0].downloaded).toBe(true);
    await webkit.remove();
    expect((await webkit.list())[0].downloaded).toBe(false);
    expect(changes).toBe(2);
  });
});
