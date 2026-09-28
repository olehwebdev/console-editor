import type { AppEvent } from '../../shared/types';
import type { PageController } from '../PageController';
import type { ShotStore } from '../store/ShotStore';

export interface DesignOverlayDeps {
  page: PageController;
  store: ShotStore;
  send(event: AppEvent): void;
}
