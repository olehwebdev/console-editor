import type { CdpTransport } from '../engine/cdp';
import { CDP } from '../engine/constants';
import { REACT_HOOK_SOURCE } from './reactHookSource';

/** The framework hooks (`REACT_HOOK_SOURCE`), put in every new document of one session while the setting is on. */
export class HookScript {
  /** The script's identifier, while installed. */
  private id: string | undefined;

  constructor(private readonly cdp: CdpTransport) {}

  /** Installs or removes the hooks to match the `frameworkHooks` setting; a document already loaded keeps what it had. */
  async sync(on: boolean): Promise<void> {
    if (on && !this.id) {
      // Scripts for new documents run only while the Page domain is on (interception turns it on too).
      await this.cdp.send(CDP.Page.enable);
      const r = await this.cdp.send<{ identifier: string }>(CDP.Page.addScriptToEvaluateOnNewDocument, { source: REACT_HOOK_SOURCE });
      this.id = r.identifier;
    } else if (!on && this.id) {
      const identifier = this.id;
      this.id = undefined;
      await this.cdp.send(CDP.Page.removeScriptToEvaluateOnNewDocument, { identifier });
    }
  }
}
