import type { InspectedComponent } from '@common/types';
import { locationKey, locationsOf, useInspectorStore } from '@/entities/inspector';
import { findOriginal } from './findOriginal';

/** Looks up the original of every code location a component names that isn't known yet, keeping each as it comes. */
export async function locateComponent(component: InspectedComponent): Promise<void> {
  const known = useInspectorStore.getState().origins;
  const unknown = locationsOf(component).filter((location) => !(locationKey(location) in known));
  await Promise.all(
    unknown.map(async (location) => {
      const place = await findOriginal(location).catch(() => null);
      useInspectorStore.getState().setOrigin(locationKey(location), place);
    }),
  );
}
