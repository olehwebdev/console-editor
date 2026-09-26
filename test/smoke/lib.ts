/** Helpers shared by the tests that drive a packaged app (packaged.ts, update.ts). */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium, type Browser, type Page } from 'playwright-core';

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as { port: number };
  await new Promise((done) => server.close(done));
  return port;
}

/** Polls `fn` until it returns a truthy value. */
export async function waitFor<T>(what: string, fn: () => Promise<T | undefined> | T | undefined, timeout = 30_000): Promise<T> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

export const pages = (browser: Browser): Page[] => browser.contexts().flatMap((c) => c.pages());

export interface RunningApp {
  process: ChildProcess;
  /** Everything it printed so far. */
  output(): string;
  exited(): boolean;
  /** Resolves when the process has ended. */
  exit: Promise<void>;
  browser: Browser;
  /** The editor window, once its UI is up. */
  editor: Page;
}

/**
 * Starts a packaged app with a debugging port (the build's fuses turn Node's
 * inspector off, so it's driven over Chromium's remote debugging port rather
 * than Playwright's Electron support) and waits for the editor window.
 */
export async function launchApp(executable: string, env: Record<string, string>): Promise<RunningApp> {
  const port = await freePort();
  const args = [`--remote-debugging-port=${port}`];
  // Chromium's sandbox can't start as root (containers); CI runners aren't root.
  if (process.platform === 'linux' && process.getuid?.() === 0) args.push('--no-sandbox');

  console.log(`Starting ${executable}`);
  const child = spawn(executable, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let exited = false;
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  const exit = new Promise<void>((done) =>
    child.on('exit', (code, signal) => {
      exited = true;
      output += `\n[app exited: ${signal ?? code}]`;
      done();
    }),
  );
  try {
    const browser = await waitFor(
      'the remote debugging port',
      async () => {
        if (exited) throw new Error('The app exited during startup');
        return chromium.connectOverCDP(`http://127.0.0.1:${port}`).catch(() => undefined);
      },
      60_000,
    );
    const editor = await waitFor('the editor window', () => pages(browser).find((p) => p.url().endsWith('/renderer/index.html')));
    await editor.waitForSelector('body[data-ready]', { timeout: 30_000 });
    return { process: child, output: () => output, exited: () => exited, exit, browser, editor };
  } catch (err) {
    child.kill();
    console.error(`--- app output ---\n${output.slice(-6000)}`);
    throw err;
  }
}
