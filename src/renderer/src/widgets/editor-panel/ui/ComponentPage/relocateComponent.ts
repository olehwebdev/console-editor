import { useInspectorStore } from '@/entities/inspector';
import { titleComponentTab } from '@/features/inspect/pick';
import { locateComponent } from '@/features/open-resource';

/** Traces the component shown again, once its bundle's map changed, and names its tab after it. */
export async function relocateComponent(): Promise<void> {
  const { component } = useInspectorStore.getState();
  if (!component) return;
  await locateComponent(component);
  titleComponentTab();
}
