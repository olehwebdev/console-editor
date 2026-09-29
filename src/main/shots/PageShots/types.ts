import type { AppEvent } from '../../../shared/types';
import type { PageController } from '../../PageController';
import type { PageDesign } from '../../overlay';
import type { ShotStore } from '../../store/ShotStore';

export interface PageShotsDeps {
  store: ShotStore;
  page: PageController;
  /** Pushes an event to the app's windows. */
  send(event: AppEvent): void;
  /** Told the design laid over the page as it changes (null: taken off). */
  onDesign?(design: PageDesign | null): void;
}
