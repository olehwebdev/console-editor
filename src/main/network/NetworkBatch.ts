import type { AppEvent, NetworkRequest } from '../../shared/types';
import { NETWORK_BATCH_MS } from './constants';

/** Sends new and changed rows to the renderer in batches, `NETWORK_BATCH_MS` apart, each row once per batch as it is then. */
export class NetworkBatch {
  /** Ids of rows changed since the last batch, in the order they first changed. */
  private pending = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly send: (event: AppEvent) => void,
    /** A row as it is now; undefined once it dropped off the log. */
    private readonly rowOf: (id: string) => NetworkRequest | undefined,
  ) {}

  /** A row is new or changed: the next batch sends it. */
  changed(id: string): void {
    this.pending.add(id);
    this.timer ??= setTimeout(() => this.flush(), NETWORK_BATCH_MS);
  }

  /** Forgets what hasn't gone out yet (the log was cleared). */
  clear(): void {
    this.pending.clear();
  }

  /** Sends what is waiting now, instead of at the end of the batch. */
  flush(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const requests = [...this.pending].map((id) => this.rowOf(id)).filter((row): row is NetworkRequest => !!row);
    this.pending.clear();
    if (requests.length) this.send({ type: 'network-requests', requests: requests.map((row) => ({ ...row })) });
  }

  /** Stops the pending batch without sending it. */
  stop(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending.clear();
  }
}
