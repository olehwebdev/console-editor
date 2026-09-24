/**
 * Launches a real Chromium with a DevTools WebSocket endpoint so tests can drive
 * the engine through the session-aware WebSocket transport (which can address
 * auto-attached iframe targets), while Playwright controls the same browser for
 * navigation and assertions (including inside cross-site iframes).
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import type { CdpTransport } from '../../src/main/engine/cdp';
import { LOCAL_NETWORK_ACCESS_FEATURES } from '../../src/main/chromiumFlags';
import { attachToPage, CdpConnection } from '../../src/main/engine/websocketTransport';

export const chromiumAvailable = (() => {
  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
})();

export interface ChromiumHarness {
  connection: CdpConnection;
  browser: Browser;
  /** Opens a new tab and returns it with an engine transport attached to it. */
  newPage(): Promise<{ page: Page; transport: CdpTransport & { detach(): Promise<void> } }>;
  close(): Promise<void>;
}

export async function launchChromium(): Promise<ChromiumHarness> {
  const userDataDir = await mkdtemp(join(tmpdir(), 'console-editor-chromium-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    // Site isolation is what puts cross-site iframes in their own process (and CDP target).
    '--site-per-process',
    // Same as the app (src/main/index.ts): a document served via Fetch.fulfillRequest has no
    // IP address space, so Local Network Access would block its requests to loopback hosts.
    `--disable-features=${LOCAL_NETWORK_ACCESS_FEATURES.join(',')}`,
    ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []),
    'about:blank',
  ];
  const proc: ChildProcess = spawn(chromium.executablePath(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise<string>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Chromium did not start:\n${output}`)), 30_000);
    proc.stderr!.on('data', (chunk) => {
      output += String(chunk);
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    proc.once('exit', (code) => reject(new Error(`Chromium exited (${code}):\n${output}`)));
  });

  const connection = await CdpConnection.connect(wsUrl);
  const browser = await chromium.connectOverCDP(wsUrl);

  return {
    connection,
    browser,
    async newPage() {
      const context = browser.contexts()[0];
      const page = await context.newPage();
      const probe = await context.newCDPSession(page);
      const { targetInfo } = (await probe.send('Target.getTargetInfo')) as { targetInfo: { targetId: string } };
      await probe.detach();
      const transport = await attachToPage(connection, targetInfo.targetId);
      return { page, transport };
    },
    async close() {
      await browser.close().catch(() => undefined);
      connection.close();
      if (proc.exitCode === null && proc.signalCode === null) {
        const exited = new Promise((r) => proc.once('exit', r));
        proc.kill();
        await exited;
      }
      await rm(userDataDir, { recursive: true, force: true, maxRetries: 5 });
    },
  };
}
