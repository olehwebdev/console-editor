import { MAX_NETWORK_REQUESTS } from '../../shared/constants';
import type { NetworkRequest } from '../../shared/types';
import { KEY_SEPARATOR } from './constants';
import type { TrackedRequest } from './types';

/**
 * The requests kept, oldest first, at most `MAX_NETWORK_REQUESTS`: each found by its row id, by the
 * session and request id that reported it (while it is in flight), or by its request id alone (what
 * the engine knows when an override answered it; a worker's request is served on its frame's session).
 */
export class RequestLog {
  private readonly rows = new Map<string, TrackedRequest>();
  private readonly byKey = new Map<string, string>();
  private readonly byRequestId = new Map<string, string>();
  private nextId = 1;

  /** Numbers and keeps a new request; the oldest drop off past the limit. */
  add(tracked: Omit<TrackedRequest, 'row'> & { row: Omit<NetworkRequest, 'id'> }): TrackedRequest {
    const id = String(this.nextId++);
    const entry: TrackedRequest = { ...tracked, row: { ...tracked.row, id } };
    this.rows.set(id, entry);
    this.byKey.set(this.key(entry.sessionId, entry.requestId), id);
    this.byRequestId.set(entry.requestId, id);
    for (const [oldId] of this.rows) {
      if (this.rows.size <= MAX_NETWORK_REQUESTS) break;
      this.drop(oldId);
    }
    return entry;
  }

  get(id: string): TrackedRequest | undefined {
    return this.rows.get(id);
  }

  /** The request a session reports under this id, while it is the latest one of that id. */
  find(sessionId: string | undefined, requestId: string): TrackedRequest | undefined {
    const id = this.byKey.get(this.key(sessionId, requestId));
    return id === undefined ? undefined : this.rows.get(id);
  }

  /** The latest request of this id on any session. */
  findAnywhere(requestId: string): TrackedRequest | undefined {
    const id = this.byRequestId.get(requestId);
    return id === undefined ? undefined : this.rows.get(id);
  }

  /** A redirect's earlier hop: its row stays, but the id now names the next hop. */
  release(entry: TrackedRequest): void {
    const key = this.key(entry.sessionId, entry.requestId);
    if (this.byKey.get(key) === entry.row.id) this.byKey.delete(key);
  }

  /** Every row, oldest first. */
  list(): NetworkRequest[] {
    return [...this.rows.values()].map((t) => t.row);
  }

  clear(): void {
    this.rows.clear();
    this.byKey.clear();
    this.byRequestId.clear();
  }

  private drop(id: string): void {
    const entry = this.rows.get(id);
    this.rows.delete(id);
    if (!entry) return;
    this.release(entry);
    if (this.byRequestId.get(entry.requestId) === id) this.byRequestId.delete(entry.requestId);
  }

  private key(sessionId: string | undefined, requestId: string): string {
    return `${sessionId ?? ''}${KEY_SEPARATOR}${requestId}`;
  }
}
