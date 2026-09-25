import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import type { ServiceWorkerState } from '../InterceptionEngine';
import { KEPT_SERVICE_WORKERS } from './constants';
import type { ChildTarget, RegistrationsUpdated, VersionsUpdated } from './types';

/**
 * What the page's interception knows of its service workers beyond their
 * sessions: what each one's last session knew (leaving its site detaches it,
 * coming back attaches the same worker on a new session), each one's
 * registration and its scope (to unregister one even while it's stopped), and
 * the ones the app unregistered.
 */
export class ServiceWorkerRegistry {
  /** What a service worker's last session knew, by target id, for the last `KEPT_SERVICE_WORKERS`. */
  private readonly kept = new Map<string, ServiceWorkerState>();
  /** Service worker target id -> registration id, and registration id -> scope. */
  private readonly registrationOf = new Map<string, string>();
  private readonly scopeOf = new Map<string, string>();
  /** Registrations reported deleted (unregistered): a worker of one is on its way out. */
  private readonly deleted = new Set<string>();
  /**
   * Service workers the app unregistered. Chromium keeps such a version running
   * while it's attached and attaches it again after a detach; it's left alone
   * then (unregistering from it would hit the registration now at its scope).
   */
  private readonly retired = new Set<string>();

  /** Follows registrations and their scopes (on the page's own connection only). Returns the unsubscribers. */
  listen(cdp: CdpTransport): Array<() => void> {
    return [
      cdp.on(CDP.ServiceWorker.workerVersionUpdated, (p: VersionsUpdated, sessionId) => {
        if (sessionId) return;
        for (const v of p.versions) if (v.targetId) this.registrationOf.set(v.targetId, v.registrationId);
      }),
      cdp.on(CDP.ServiceWorker.workerRegistrationUpdated, (p: RegistrationsUpdated, sessionId) => {
        if (sessionId) return;
        for (const r of p.registrations) {
          if (r.isDeleted) {
            this.scopeOf.delete(r.registrationId);
            this.deleted.add(r.registrationId);
          } else {
            this.scopeOf.set(r.registrationId, r.scopeURL);
          }
        }
      }),
    ];
  }

  /** What the service worker's last session knew, if it had one. */
  previous(targetId: string): ServiceWorkerState | undefined {
    return this.kept.get(targetId);
  }

  /** Service workers with no session left, by target id, with what their last session knew. */
  detached(attached: ReadonlySet<string>): Array<[targetId: string, state: ServiceWorkerState]> {
    return [...this.kept].filter(([targetId]) => !attached.has(targetId));
  }

  /** Remembers a service worker whose session goes away, unless it was unregistered. */
  keep(child: ChildTarget): void {
    this.kept.delete(child.targetId);
    const state = !child.retired && child.engine.serviceWorkerState();
    if (!state) return;
    this.kept.set(child.targetId, state);
    if (this.kept.size > KEPT_SERVICE_WORKERS) this.kept.delete(this.kept.keys().next().value!);
  }

  /** Stops remembering a service worker (unregistered, or its registration is gone). */
  forget(targetId: string): void {
    this.kept.delete(targetId);
  }

  isRetired(targetId: string): boolean {
    return this.retired.has(targetId);
  }

  /** The app unregistered this service worker: it is let go, and left alone if Chromium attaches it again. */
  retire(targetId: string): void {
    this.retired.add(targetId);
  }

  /** Whether the service worker's registration was reported deleted. */
  isDeleted(targetId: string): boolean {
    const registration = this.registrationOf.get(targetId);
    return !!registration && this.deleted.has(registration);
  }

  /** The scope of the service worker's registration, while known. */
  scope(targetId: string): string | undefined {
    const registration = this.registrationOf.get(targetId);
    return registration && this.scopeOf.get(registration);
  }

  /** Forgets everything: interception stopped. */
  clear(): void {
    this.kept.clear();
    this.retired.clear();
    this.deleted.clear();
  }
}
