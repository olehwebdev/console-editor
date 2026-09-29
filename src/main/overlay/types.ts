import type { AppEvent, OverlaySettings } from '../../shared/types';
import type { PageController } from '../PageController';
import type { ShotStore } from '../store/ShotStore';

export interface DesignOverlayDeps {
  page: PageController;
  store: ShotStore;
  send(event: AppEvent): void;
  /** Told the design as it is laid, restyled or taken off (null), for other browsers' tabs to have it too. */
  onDesign?(design: PageDesign | null): void;
}

/** A design as laid over a page: its image (base64), its size in CSS pixels, and how it is laid. */
export interface PageDesign {
  /** Which image it is (its shot's id): the same one is only restyled. */
  key: string;
  base64: string;
  width: number;
  height: number;
  settings: OverlaySettings;
}
