import { safeStorage } from 'electron';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { BASIC_TEXT_BACKEND, LINUX, TOKEN_FILE_MODE } from './constants';
import type { TokenCrypt } from './types';

/**
 * A personal access token for Figma's API, kept in the data folder encrypted by the system (Keychain, DPAPI, the
 * keyring); for this run only where the system can't encrypt it (Linux without a keyring).
 */
export class FigmaToken {
  private token: string | null = null;

  constructor(
    private readonly file: string,
    private readonly crypt: TokenCrypt = safeStorage,
  ) {}

  async get(): Promise<string | null> {
    if (this.token || !this.encrypts()) return this.token;
    const bytes = await readFile(this.file).catch(() => null);
    try {
      this.token = bytes ? this.crypt.decryptString(bytes) : null;
    } catch {
      this.token = null;
    }
    return this.token;
  }

  async set(token: string): Promise<void> {
    this.token = token;
    if (this.encrypts()) await writeFile(this.file, this.crypt.encryptString(token), { mode: TOKEN_FILE_MODE });
  }

  async clear(): Promise<void> {
    this.token = null;
    await rm(this.file, { force: true });
  }

  private encrypts(): boolean {
    if (!this.crypt.isEncryptionAvailable()) return false;
    return process.platform !== LINUX || this.crypt.getSelectedStorageBackend?.() !== BASIC_TEXT_BACKEND;
  }
}
