import { answerContext, type AnswerSources } from '../answering';
import { answerRequest } from './answerRequest';
import { answerResponse } from './answerResponse';
import { BIDI, CACHE_BEHAVIOR, INTERCEPT_PHASES, MAX_REQUEST_BODY, REQUEST_DATA } from './constants';
import type { BidiConnection } from './BidiConnection';
import type { BidiAnswerContext, BidiNetworkEvent } from './types';

/** What answers a request paused at each phase. */
const ANSWERS: Readonly<Record<string, (ctx: BidiAnswerContext, event: BidiNetworkEvent) => Promise<void>>> = {
  [BIDI.network.beforeRequestSent]: answerRequest,
  [BIDI.network.responseStarted]: answerResponse,
};

/**
 * The workspace's overrides and rules in every tab of a browser driven over WebDriver BiDi (Firefox): the engine's
 * matching and rules on each paused request, requests paused only while an override or a rule is on, and the cache
 * bypassed then (and when the settings say so) so every request is seen. Request bodies are kept, to read the GraphQL
 * operation they name, only while an override names one.
 */
export class BidiInterception {
  private readonly ctx: BidiAnswerContext;
  private intercept: string | null = null;
  private updating = Promise.resolve();
  private off: (() => void) | undefined;

  constructor(connection: BidiConnection, sources: AnswerSources) {
    this.ctx = { ...answerContext(sources), connection, collector: null };
  }

  async start(): Promise<void> {
    this.off = this.ctx.connection.onEvent((method, params: BidiNetworkEvent) => {
      // A request gone meanwhile (the tab closed, or it was answered already) can't be answered: nothing to do.
      if (params?.isBlocked && Object.hasOwn(ANSWERS, method)) void ANSWERS[method](this.ctx, params).catch(() => undefined);
    });
    await this.ctx.connection.send(BIDI.session.subscribe, { events: Object.keys(ANSWERS) });
    await this.refresh();
  }

  /** After overrides or rules changed: requests are paused while any is on, and matched afresh. */
  refresh(): Promise<void> {
    this.updating = this.updating.then(() => this.update()).catch(() => undefined);
    return this.updating;
  }

  /** After the settings changed: the cache used or bypassed. */
  async applySettings(): Promise<void> {
    const bypass = this.intercept !== null || this.ctx.sources.getSettings().disableCache;
    await this.ctx.connection.send(BIDI.network.setCacheBehavior, { cacheBehavior: bypass ? CACHE_BEHAVIOR.bypass : CACHE_BEHAVIOR.normal });
  }

  /** Stops pausing requests; the connection stays. */
  stop(): void {
    this.off?.();
    if (this.intercept) this.ctx.connection.send(BIDI.network.removeIntercept, { intercept: this.intercept }).catch(() => undefined);
    if (this.ctx.collector) this.ctx.connection.send(BIDI.network.removeDataCollector, { collector: this.ctx.collector }).catch(() => undefined);
    this.intercept = null;
    this.ctx.collector = null;
  }

  private async update(): Promise<void> {
    const { connection, sources, overrides, matchers } = this.ctx;
    overrides.clear();
    matchers.clear();
    const needed = sources.getOverrides().some((o) => o.enabled) || sources.getRules().some((r) => r.enabled);
    if (needed && !this.intercept) this.intercept = (await connection.send<{ intercept: string }>(BIDI.network.addIntercept, { phases: [...INTERCEPT_PHASES] })).intercept;
    if (!needed && this.intercept) {
      const intercept = this.intercept;
      this.intercept = null;
      await connection.send(BIDI.network.removeIntercept, { intercept }).catch(() => undefined);
    }
    await this.collect(sources.getOverrides().some((o) => o.enabled && !!o.request?.operation));
    await this.applySettings();
  }

  /** Keeps request bodies while `needed` (never in a Firefox too old to keep them: the operation is then unknown). */
  private async collect(needed: boolean): Promise<void> {
    const { connection, collector } = this.ctx;
    if (needed && !collector) {
      const params = { dataTypes: [REQUEST_DATA], maxEncodedDataSize: MAX_REQUEST_BODY };
      this.ctx.collector = (await connection.send<{ collector: string }>(BIDI.network.addDataCollector, params).catch(() => null))?.collector ?? null;
    }
    if (!needed && collector) {
      this.ctx.collector = null;
      await connection.send(BIDI.network.removeDataCollector, { collector }).catch(() => undefined);
    }
  }
}
