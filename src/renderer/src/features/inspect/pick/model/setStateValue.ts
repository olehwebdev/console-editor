import type { StateEdit } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';
import { useInspectorStore } from '@/entities/inspector';

/** Sets a state value of the component shown, and shows it as it rendered with it. False when it couldn't, after saying why. */
export async function setStateValue(edit: StateEdit): Promise<boolean> {
  const { component, setComponent } = useInspectorStore.getState();
  if (!component) return false;
  try {
    setComponent(await api.setComponentState(component.pickId, component.depth, edit));
    return true;
  } catch (err) {
    toast({ title: "Couldn't set that value", description: errorMessage(err), tone: 'danger' });
    return false;
  }
}
