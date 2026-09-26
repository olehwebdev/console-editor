import type { CodeLocation, InspectedComponent } from '@common/types';
import { locationKey } from './locationKey';

/** Every code location a component names (its chain, values, contexts, handlers), each once. */
export function locationsOf(component: InspectedComponent): CodeLocation[] {
  const all = [...component.chain, ...component.props, ...component.state, ...component.context, ...component.handlers].map((item) => item.location);
  const unique = new Map<string, CodeLocation>();
  for (const location of all) {
    if (location) unique.set(locationKey(location), location);
  }
  return [...unique.values()];
}
