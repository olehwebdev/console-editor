import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';

/** What `Debugger.scriptParsed` says of a script that we keep. */
interface ParsedScript {
  scriptId: string;
  url: string;
  sourceMapURL?: string;
  executionContextAuxData?: { frameId?: string; isDefault?: boolean };
}

/** A script of the session: its URL, the source map it names ('' for none), and the frame whose main world runs it (else null). */
export interface ScriptRecord {
  url: string;
  sourceMap: string;
  frameId: string | null;
}

/**
 * The scripts of one session, by script id: their URLs, for the places V8 gives
 * functions (`[[FunctionLocation]]`), and the source maps they name, for the page
 * stack. Only `Debugger.scriptParsed` says, and turning the Debugger domain on
 * replays it for every script already parsed: it is turned on just for that,
 * with pauses skipped (a page's `debugger` statement can't stop it), then off
 * again, whenever a script id isn't known yet or a frame's scripts are listed.
 */
export class ScriptUrls {
  private readonly scripts = new Map<string, ScriptRecord>();
  private refreshing: Promise<void> | null = null;

  constructor(private readonly cdp: CdpTransport) {}

  async url(scriptId: string): Promise<string | null> {
    if (!this.scripts.has(scriptId)) await this.refresh();
    return this.scripts.get(scriptId)?.url || null;
  }

  /** The scripts a frame's main world runs, as V8 lists them now. */
  async ofFrame(frameId: string): Promise<ScriptRecord[]> {
    await this.refresh();
    return [...this.scripts.values()].filter((script) => script.frameId === frameId);
  }

  private refresh(): Promise<void> {
    this.refreshing ??= this.replay().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async replay(): Promise<void> {
    const off = this.cdp.on(CDP.Debugger.scriptParsed, (p: ParsedScript) => {
      const context = p.executionContextAuxData;
      this.scripts.set(p.scriptId, { url: p.url, sourceMap: p.sourceMapURL ?? '', frameId: context?.isDefault && context.frameId ? context.frameId : null });
    });
    try {
      await this.cdp.send(CDP.Debugger.enable);
      await this.cdp.send(CDP.Debugger.setSkipAllPauses, { skip: true });
    } finally {
      off();
      await this.cdp.send(CDP.Debugger.disable).catch(() => undefined);
    }
  }
}
