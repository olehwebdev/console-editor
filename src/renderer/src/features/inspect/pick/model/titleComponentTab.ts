import { useTabStore } from '@/entities/editor-tab';
import { componentTitle, useInspectorStore } from '@/entities/inspector';
import { COMPONENT_TAB } from './constants';

/** Names the Component page's tab after its component again, once its original's name is known: in place, without switching to it. */
export function titleComponentTab(): void {
  const { component, origins } = useInspectorStore.getState();
  if (component) useTabStore.getState().retitlePage(COMPONENT_TAB, componentTitle(component, origins));
}
