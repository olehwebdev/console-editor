import type { CdpTransport } from '../cdp';
import { CDP } from '../constants';
import { SRI_GUARD_SOURCE } from '../transform';

/** The SRI guard script (`SRI_GUARD_SOURCE`), injected into every new document while SRI stripping is on. */
export class SriGuard {
  /** Identifier of the injected SRI guard script, while installed. */
  private id: string | undefined;

  constructor(private readonly cdp: CdpTransport) {}

  /** Installs or removes the guard to match the `stripIntegrity` setting. */
  async sync(stripIntegrity: boolean): Promise<void> {
    if (stripIntegrity && !this.id) {
      const r = await this.cdp.send<{ identifier: string }>(CDP.Page.addScriptToEvaluateOnNewDocument, { source: SRI_GUARD_SOURCE });
      this.id = r.identifier;
    } else if (!stripIntegrity && this.id) {
      await this.cdp.send(CDP.Page.removeScriptToEvaluateOnNewDocument, { identifier: this.id });
      this.id = undefined;
    }
  }
}
