import type { CdpTransport } from '../../engine/cdp';
import { CDP } from '../../engine/constants';
import { HIGHLIGHT_CONFIG, INSPECT_MODE } from '../constants';

/** Puts one session in inspect mode: Chromium highlights what is under the pointer, and a click picks it instead of reaching the page. */
export async function enterInspectMode(transport: CdpTransport): Promise<void> {
  await transport.send(CDP.DOM.enable);
  await transport.send(CDP.Overlay.enable);
  // Hovered nodes come as node ids, which need the document requested first.
  await transport.send(CDP.DOM.getDocument, { depth: 0 });
  await transport.send(CDP.Overlay.setInspectMode, { mode: INSPECT_MODE.pick, highlightConfig: HIGHLIGHT_CONFIG });
}
