import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';

/**
 * The URL of each script of one session, by script id, for the places V8 gives
 * functions (`[[FunctionLocation]]`). Only `Debugger.scriptParsed` names them, and
 * turning the Debugger domain on replays it for every script already parsed: it
 * is turned on just for that, with pauses skipped (a page's `debugger` statement
 * can't stop it), then off again, whenever a script id isn't known yet.
 */
export class ScriptUrls {
  private readonly urls = new Map<string, string>();
  private refreshing: Promise<void> | null = null;

  constructor(private readonly cdp: CdpTransport) {}

  async url(scriptId: string): Promise<string | null> {
    if (!this.urls.has(scriptId)) await this.refresh();
    return this.urls.get(scriptId) || null;
  }

  private refresh(): Promise<void> {
    this.refreshing ??= this.replay().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async replay(): Promise<void> {
    const off = this.cdp.on(CDP.Debugger.scriptParsed, (p: { scriptId: string; url: string }) => this.urls.set(p.scriptId, p.url));
    try {
      await this.cdp.send(CDP.Debugger.enable);
      await this.cdp.send(CDP.Debugger.setSkipAllPauses, { skip: true });
    } finally {
      off();
      await this.cdp.send(CDP.Debugger.disable).catch(() => undefined);
    }
  }
}
