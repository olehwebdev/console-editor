import type { EngineEvent, NetworkBody, NetworkRequest, NetworkRequestDetail, SocketMessages } from '../../shared/types';
import { harOf, type HarLog } from '../har';
import { NETWORK_EVENT_HANDLERS } from './events';
import { HeldRequests } from './HeldRequests';
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
  /** The requests breakpoints hold now: their rows say so. */
  readonly held: HeldRequests;

  constructor(private readonly opts: NetworkLogOptions) {
    this.batch = new NetworkBatch(opts.send, (id) => this.log.get(id)?.row);
    this.ctx = { log: this.log, batch: this.batch, page: { load: 0 }, workers: new Map(), heldMarks: new Map() };
    this.held = new HeldRequests({ transport: opts.transport, send: opts.send, mark: (networkId, heldId) => this.markHeld(networkId, heldId) });
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

  /** A WebSocket's messages from number `from` on, of those still kept (none for any other request). */
  messages(id: unknown, from: unknown = 0): SocketMessages {
    const entry = this.entry(id);
    const kept = entry.messages ?? [];
    const first = (entry.row.messages ?? 0) - kept.length;
    const skip = Math.max(0, (Number.isSafeInteger(from) ? (from as number) : 0) - first);
    return { first: first + Math.min(skip, kept.length), messages: kept.slice(skip) };
  }

  /** The requests with these ids that are still logged, as a HAR log with the bodies that can still be read. */
  har(ids: readonly string[], version: string): Promise<HarLog> {
    const entries = ids.flatMap((id) => this.log.get(id) ?? []);
    return harOf(this.opts.transport, entries, version);
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
    this.held.stop();
    this.batch.stop();
  }

  private markHeld(networkId: string, heldId: string | undefined): void {
    const entry = this.log.findAnywhere(networkId);
    if (!entry) {
      // Not listed yet: its row takes the mark when it comes.
      if (heldId) this.ctx.heldMarks.set(networkId, heldId);
      else this.ctx.heldMarks.delete(networkId);
      return;
    }
    if (heldId) entry.row.heldId = heldId;
    else delete entry.row.heldId;
    this.batch.changed(entry.row.id);
  }

  private entry(id: unknown): TrackedRequest {
    const entry = typeof id === 'string' ? this.log.get(id) : undefined;
    if (!entry) throw new Error('That request is no longer in the log');
    return entry;
  }
}
