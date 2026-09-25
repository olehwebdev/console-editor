import type { StateEdit } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useInspectorStore } from '@/entities/inspector';

/**
 * Sets a state value of the component shown (`label`: its name as shown), and shows it as it rendered with
 * it; the edit is kept, for keeping as an action. False when it couldn't, after saying why.
 */
export async function setStateValue(edit: StateEdit, label = edit.name): Promise<boolean> {
  const { component, setComponent, setLastEdit } = useInspectorStore.getState();
  if (!component) return false;
  try {
    setComponent(await api.setComponentState(component.pickId, component.depth, edit));
    setLastEdit({ pickId: component.pickId, depth: component.depth, edit, label });
    return true;
  } catch (err) {
    toast({ title: "Couldn't set that value", description: errorMessage(err), tone: 'danger' });
    return false;
  }
}
