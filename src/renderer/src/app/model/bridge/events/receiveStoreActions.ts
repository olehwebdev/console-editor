import type { StoreAction } from '@common/types';
import { useStoreLog } from '@/entities/inspector';
import { locateLocations } from '@/features/open-resource';

/** Store actions recorded: they join the Stores log, and the calls of their stacks are traced to the originals (to tell the app's own). */
export function receiveStoreActions(actions: StoreAction[]): void {
  useStoreLog.getState().add(actions);
  void locateLocations(actions.flatMap((action) => action.stack));
}
