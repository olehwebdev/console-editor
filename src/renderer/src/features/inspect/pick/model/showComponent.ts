import type { InspectedComponent } from '@common/types';
import { useTabStore } from '@/entities/editor-tab';
import { componentTitle, useInspectorStore } from '@/entities/inspector';
import { COMPONENT_TAB } from './constants';

/** Shows a component on the Component page, opening it (or switching to it). */
export function showComponent(component: InspectedComponent): void {
  const { setComponent, origins } = useInspectorStore.getState();
  setComponent(component);
  useTabStore.getState().openPage({ id: COMPONENT_TAB, page: 'component', title: componentTitle(component, origins) });
}
