import { useActionEditor } from '@/features/action/edit';
import { useLayout } from '../../model/layout';

const { setSidebar } = useLayout.getState();
const { startNew } = useActionEditor.getState();

/** Opens the Actions view on a new, empty action. */
export function newAction(): void {
  startNew();
  setSidebar('actions');
}
