import { validateHeldAction } from '../../shared/breakpoints';
import type { HeldAction, HeldRequest } from '../../shared/types';
import { CDP } from '../engine/constants';
import type { HoldInput } from '../engine/InterceptionEngine';
import { HELD_ID_PREFIX } from './constants';
import type { HeldRequestsOptions } from './types';

/** A held request, and how to let it go. */
interface Holding {
  request: HeldRequest;
  networkId?: string;
  /** The engine that paused it. */
  owner: object;
  decide(action: HeldAction | undefined): void;
}

/**
 * The requests breakpoints hold, for the whole page (its iframes' sessions too), each waiting for the
 * user's action. One the page gives up on (it cancelled it, or left the page) is let go, as is every
 * one of a session that went: nothing could answer them any more. The renderer gets the list whole on
 * every change, and the request log marks their rows.
 */
export class HeldRequests {
  private readonly held = new Map<string, Holding>();
  private next = 0;
  private readonly stopListening: () => void;

  constructor(private readonly opts: HeldRequestsOptions) {
    // Given up by the page: `Fetch` commands for it would fail.
    this.stopListening = opts.transport.on(CDP.Network.loadingFailed, (p: { requestId: string }) => this.abandon(p.requestId));
  }

  /** The held requests, oldest first. */
  list(): HeldRequest[] {
    return [...this.held.values()].map((h) => h.request);
  }

  /** Holds a request until the user decides (see `EngineOptions.hold`). */
  hold({ networkId, ...request }: HoldInput, owner: object): Promise<HeldAction | undefined> {
    const id = `${HELD_ID_PREFIX}${++this.next}`;
    return new Promise((decide) => {
      this.held.set(id, { request: { ...request, id, heldAt: Date.now() }, ...(networkId ? { networkId } : {}), owner, decide });
      if (networkId) this.opts.mark(networkId, id);
      this.changed();
    });
  }

  /** Lets a held request go as `action` says; throws for one no longer held, or an action it can't take. */
  resume(id: unknown, action: HeldAction): void {
    const holding = typeof id === 'string' ? this.held.get(id) : undefined;
    if (!holding) throw new Error('That request is no longer held: it was answered, or the page gave up on it');
    const problem = validateHeldAction(action) ?? (action.type === 'send' && holding.request.stage !== 'request' ? 'Its request was sent already' : null);
    if (problem) throw new Error(problem);
    this.letGo(holding.request.id, action);
  }

  /** Lets go of every request `owner` holds (its session went away). */
  releaseOwner(owner: object): void {
    for (const [id, h] of this.held) if (h.owner === owner) this.letGo(id, undefined);
  }

  /** Stops listening, and lets go of everything held. */
  stop(): void {
    this.stopListening();
    for (const id of [...this.held.keys()]) this.letGo(id, undefined);
  }

  private abandon(networkId: string): void {
    for (const [id, h] of this.held) if (h.networkId === networkId) this.letGo(id, undefined);
  }

  private letGo(id: string, action: HeldAction | undefined): void {
    const holding = this.held.get(id);
    if (!holding) return;
    this.held.delete(id);
    if (holding.networkId) this.opts.mark(holding.networkId, undefined);
    holding.decide(action);
    this.changed();
  }

  private changed(): void {
    this.opts.send({ type: 'held-requests', held: this.list() });
  }
}
