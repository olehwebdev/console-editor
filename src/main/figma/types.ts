import type { Shot } from '../../shared/types';

/** The system's encryption, as the token store uses it (Electron's `safeStorage`; tests hand a stand-in). */
export interface TokenCrypt {
  isEncryptionAvailable(): boolean;
  encryptString(text: string): Buffer;
  decryptString(bytes: Buffer): string;
  getSelectedStorageBackend?(): string;
}

export interface FigmaImporterDeps {
  /** Where the token is kept. */
  tokenFile: string;
  /** Figma's API, or a stand-in for it (tests). */
  api: string;
  /** Keeps an image as a design of the active workspace. */
  addDesign(name: string, bytes: Uint8Array): Promise<Shot>;
  crypt?: TokenCrypt;
}

/** What Figma's API answers for a file's nodes, as far as a frame's name goes. */
export interface NodesAnswer {
  nodes?: Record<string, { document?: { name?: unknown } } | null>;
}

/** What Figma's API answers for an export: each node's image address (null when it couldn't render it). */
export interface ImagesAnswer {
  err?: string | null;
  images?: Record<string, string | null>;
}
