import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BIDI_PORT_FILE, SESSION_PATH } from './constants';

/** The WebDriver BiDi address of the Firefox whose profile is `dir`, from the file it wrote there; null when there is none (yet). */
export async function readBidiPort(dir: string): Promise<string | null> {
  const text = await readFile(join(dir, BIDI_PORT_FILE), 'utf8').catch(() => '');
  try {
    const { ws_host: host, ws_port: port } = JSON.parse(text) as { ws_host?: unknown; ws_port?: unknown };
    return typeof host === 'string' && Number.isInteger(port) ? `ws://${host}:${String(port)}${SESSION_PATH}` : null;
  } catch {
    return null;
  }
}
