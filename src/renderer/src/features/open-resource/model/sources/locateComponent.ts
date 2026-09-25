import type { InspectedComponent } from '@common/types';
import { locationsOf } from '@/entities/inspector';
import { locateLocations } from './locateLocations';
import { nameHooks } from './nameHooks';

/** Looks up the original of every code location a component names that isn't known yet; then a React component's hook names. */
export async function locateComponent(component: InspectedComponent): Promise<void> {
  await locateLocations(locationsOf(component));
  await nameHooks(component);
}
