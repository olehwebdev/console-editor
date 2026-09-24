import type { MissedReason, ResourceEntry, WorkerType } from '../../../shared/types';
import { TARGET_TYPE } from '../constants';
import { OTHER_RESOURCE_TYPE } from './constants';
import { MISSED_REASONS } from './missedReasons';
import type { RequestWillBeSentParams, ServedScript, ServiceWorkerState, WorkerInfo } from './types';
import { WORKER_SESSIONS } from './workerSessions';

/**
 * What a worker session knows of the worker's own scripts: its script URL
 * (final once its first script's response arrives, after redirects), whether
 * that first script is listed and, for a service worker, the override version
 * each script was served, to tell when it runs outdated code (Chromium keeps
 * installed scripts and doesn't fetch them again on reload).
 */
export class WorkerScripts {
  private scriptUrl: string;
  /** Script URL -> how it was paused and the override version it was served (`id@updatedAt`, '' for the live file). */
  private readonly servedScripts = new Map<string, ServedScript>();
  /** A service worker's first script was fetched on this session (it installed through it). */
  private installSeen = false;
  /**
   * The worker's own first script: not seen, requested on this session, or
   * listed. Usually its `responseReceived` lists it; `loadingFinished` is the
   * fallback when none comes, and `Inspector.workerScriptLoaded` when the
   * session never fetched it (an installed service worker, or a shared worker
   * whose script its page fetched).
   */
  private mainScript: 'unseen' | 'requested' | 'listed' = 'unseen';

  constructor(readonly info: WorkerInfo) {
    this.scriptUrl = info.previous?.url ?? info.url;
    this.installSeen = info.previous?.installSeen ?? false;
    for (const [url, served] of info.previous?.servedScripts ?? []) this.servedScripts.set(url, served);
  }

  get url(): string {
    return this.scriptUrl;
  }

  get type(): WorkerType {
    return this.info.type;
  }

  get isServiceWorker(): boolean {
    return this.info.type === TARGET_TYPE.serviceWorker;
  }

  /** Its session has a Fetch domain: dedicated workers' and worklets' loads are paused on their frame's. */
  get hasFetch(): boolean {
    return WORKER_SESSIONS[this.info.type].fetch;
  }

  /** Its scripts are paused, and listed from the pause, on its own session (see `WorkerSession`). */
  get pausesScripts(): boolean {
    return WORKER_SESSIONS[this.info.type].pausesScripts;
  }

  /** Its first script is listed. */
  get mainScriptListed(): boolean {
    return this.mainScript === 'listed';
  }

  /** Its first script wasn't even requested on this session. */
  get mainScriptUnseen(): boolean {
    return this.mainScript === 'unseen';
  }

  markListed(): void {
    this.mainScript = 'listed';
  }

  /** Whether a request paused on its session is its own first script (paused as `Other`). */
  isOwnScript(url: string, resourceType: string): boolean {
    return resourceType === OTHER_RESOURCE_TYPE && url === this.scriptUrl;
  }

  /** What its entries are labelled with. */
  label(): Pick<ResourceEntry, 'worker' | 'workerId'> {
    return { worker: { type: this.info.type, url: this.scriptUrl }, workerId: this.info.id };
  }

  /** `Network.requestWillBeSent` on its session: sent again, with the new URL, for each redirect of its first script. */
  requested(p: RequestWillBeSentParams): void {
    if (p.requestId !== this.info.targetId || this.mainScriptListed) return;
    this.scriptUrl = p.request.url;
    this.mainScript = 'requested';
    if (this.isServiceWorker) this.installSeen = true;
  }

  /** A response on its session. Returns whether it is its first script, reported under its own request id. */
  responded(requestId: string, url: string): boolean {
    const isMainScript = requestId === this.info.targetId;
    // Chromium's update check reports a new version's script under another request id, paused nowhere.
    const checkedScript = this.isServiceWorker && !isMainScript && !this.mainScriptListed && url === this.scriptUrl;
    if (isMainScript || checkedScript) {
      this.scriptUrl = url;
      this.mainScript = 'listed';
      if (this.isServiceWorker) this.installSeen = true;
    }
    return isMainScript;
  }

  /** A service worker's script was paused on its session and served `version`. */
  paused(url: string, resourceType: string, version: string): void {
    this.servedScripts.set(url, { resourceType, version });
    // Its own script, paused here: installed through this session, whatever it reports.
    if (this.isOwnScript(url, resourceType)) this.installSeen = true;
  }

  /** Why a file it loaded wasn't served, when that's known. */
  missedReason(url: string, isMainScript: boolean): MissedReason | undefined {
    return MISSED_REASONS[this.info.type]({ nested: !!this.info.nested, mainScript: isMainScript, pausedHere: this.servedScripts.has(url) });
  }

  /** For a service worker: what this session knows, for its next one. `scripts`: its listed scripts. */
  state(scripts: ResourceEntry[]): ServiceWorkerState | undefined {
    if (!this.isServiceWorker) return undefined;
    return { url: this.scriptUrl, installSeen: this.installSeen, servedScripts: new Map(this.servedScripts), scripts };
  }
}
