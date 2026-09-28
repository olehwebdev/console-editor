import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ACTIVE_PORT_FILE } from './constants';

/** The WebSocket address of the browser whose profile is `dir`, from the file it wrote there; null when there is none (yet). */
export async function readActivePort(dir: string): Promise<string | null> {
  const text = await readFile(join(dir, ACTIVE_PORT_FILE), 'utf8').catch(() => '');
  const [port, path] = text.split(/\r?\n/);
  return /^\d+$/.test(port ?? '') && path?.startsWith('/') ? `ws://127.0.0.1:${port}${path}` : null;
}
