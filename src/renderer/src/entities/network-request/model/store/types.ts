import type { NetworkRequest } from '@common/types';

export interface NetworkStore {
  /** The requests kept, oldest first (at most `MAX_NETWORK_REQUESTS`). */
  requests: NetworkRequest[];

  /** Adds new rows and replaces changed ones in place (rows keep their order: by id, which grows). */
  upsert(requests: readonly NetworkRequest[]): void;
  setAll(requests: readonly NetworkRequest[]): void;
  /** Drops the rows of page loads before `pageLoad`. */
  dropBefore(pageLoad: number): void;
  clear(): void;
}
