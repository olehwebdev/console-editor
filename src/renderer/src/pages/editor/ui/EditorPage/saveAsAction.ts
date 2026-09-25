import type { ConsoleFrame } from '@common/types';
import { startFromCode } from '@/features/action/edit';
import { useLayout } from '../../model/layout';

const { setSidebar } = useLayout.getState();

/** Opens the Actions view on a new action made from code (you ran in the console, or the Component page wrote), in its frame. */
export function saveAsAction(code: string, frame: ConsoleFrame | undefined, name?: string): void {
  startFromCode(code, frame, name);
  setSidebar('actions');
}
