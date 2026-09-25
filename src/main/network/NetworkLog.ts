import type { EngineEvent, NetworkBody, NetworkRequest, NetworkRequestDetail } from '../../shared/types';
import { NETWORK_EVENT_HANDLERS } from './events';
import { NetworkBatch } from './NetworkBatch';
import { readRequestBody } from './readRequestBody';
import { readResponseBody } from './readResponseBody';
import { RequestLog } from './RequestLog';
import type { NetworkLogContext, NetworkLogOptions, TrackedRequest } from './types';

/**
 * The page's requests, for the Network panel (SPEC §6.10): what the page, its iframes and its workers
 * send, from the `Network` events interception already enables on every session. It sends no command
 * but reads (a body, on demand), so it never holds a waiting worker back. Rows go to the renderer in
 * batches; the most recent `MAX_NETWORK_REQUESTS` are kept for one that (re)starts.
 */
export class NetworkLog {
  private readonly log = new RequestLog();
  private readonly batch: NetworkBatch;
  private readonly ctx: NetworkLogContext;
  private readonly disposers: Array<() => void> = [];

  constructor(private readonly opts: NetworkLogOptions) {
    this.batch = new NetworkBatch(opts.send, (id) => this.log.get(id)?.row);
    this.ctx = { log: this.log, batch: this.batch, page: { load: 0 }, workers: new Map() };
    for (const [event, handler] of NETWORK_EVENT_HANDLERS) {
      this.disposers.push(opts.transport.on(event, (params, sessionId) => handler(this.ctx, params, sessionId)));
    }
  }

  list(): NetworkRequest[] {
    return this.log.list().map((row) => ({ ...row }));
  }

  async detail(id: unknown): Promise<NetworkRequestDetail> {
    const entry = this.entry(id);
    const body = await readRequestBody(this.opts.transport, entry);
    return {
      requestHeaders: entry.wireRequestHeaders ?? entry.requestHeaders,
      responseHeaders: entry.wireResponseHeaders ?? entry.responseHeaders,
      ...(body !== undefined ? { body } : {}),
      statusText: entry.statusText,
    };
  }

  async responseBody(id: unknown): Promise<NetworkBody> {
    return readResponseBody(this.opts.transport, this.entry(id));
  }

  clear(): void {
    this.log.clear();
    this.batch.clear();
    this.opts.send({ type: 'network-cleared' });
  }

  /** The engine answered a request with an override: its row says so. */
  engineEvent(event: EngineEvent): void {
    if (event.type !== 'override-served' || !event.requestId) return;
    const entry = this.log.findAnywhere(event.requestId);
    if (!entry) return;
    entry.row.overrideId = event.overrideId;
    this.batch.changed(entry.row.id);
  }

  dispose(): void {
    for (const dispose of this.disposers.splice(0)) dispose();
    this.batch.stop();
  }

  private entry(id: unknown): TrackedRequest {
    const entry = typeof id === 'string' ? this.log.get(id) : undefined;
    if (!entry) throw new Error('That request is no longer in the log');
    return entry;
  }
}
