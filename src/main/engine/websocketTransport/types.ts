export interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
  method: string;
  sessionId?: string;
}

export type RawHandler = (method: string, params: unknown, sessionId: string | undefined) => void;
