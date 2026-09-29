import type { CdpTransport } from '../cdp';

export interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
  method: string;
  sessionId?: string;
}

export type RawHandler = (method: string, params: unknown, sessionId: string | undefined) => void;

/** A page's session on a browser-level connection, as a transport rooted at it. */
export type PageTransport = CdpTransport & { readonly sessionId: string; detach(): Promise<void> };
