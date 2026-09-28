import { spawn } from 'node:child_process';
import { launchEnv } from './launchEnv';
import type { BrowserCommand } from './types';

/** Starts a browser's command with `args` where the address goes, on its own (it outlives the app); resolves once it has started. */
export function startBrowser({ command, urlAt }: BrowserCommand, args: string[]): Promise<void> {
  const [program, ...rest] = [...command.slice(0, urlAt), ...args, ...command.slice(urlAt)];
  return new Promise((resolve, reject) => {
    const child = spawn(program, rest, { detached: true, stdio: 'ignore', env: launchEnv(), windowsHide: false });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}
