import type { OverlaySettings, OverlayState } from './overlay';

/** The design overlay's part of the API exposed to the renderer (`ConsoleEditorApi`). */
export interface OverlayApi {
  /** The design laid over the page, if any. */
  getOverlay(): Promise<OverlayState | null>;
  /** Lays a design (or capture) over the page, in its top frame, after reloads too; it replaces any other. */
  showOverlay(shotId: string): Promise<OverlayState>;
  updateOverlay(patch: Partial<OverlaySettings>): Promise<OverlayState>;
  removeOverlay(): Promise<void>;
}
