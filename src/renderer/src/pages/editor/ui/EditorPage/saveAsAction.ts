import type { ConsoleFrame } from '@common/types';
import { startFromCode } from '@/features/action/edit';
import { useLayout } from '../../model/layout';

const { setSidebar } = useLayout.getState();

/** Opens the Actions view on a new action made from code you ran in the console, in the frame it ran in. */
export function saveAsAction(code: string, frame: ConsoleFrame | undefined): void {
  startFromCode(code, frame);
  setSidebar('actions');
}
