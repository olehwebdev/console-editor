import type { OverlayState, Shot } from '@common/types';

export interface ShotStore {
  /** The active workspace's captures and designs, newest first. */
  shots: Shot[];
  /** The design laid over the page, if any. */
  overlay: OverlayState | null;

  setAll(shots: Shot[]): void;
  setOverlay(overlay: OverlayState | null): void;
}
