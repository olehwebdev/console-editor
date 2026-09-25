import type { InspectedComponent } from '@common/types';
import { nameHooksAt } from './nameHooksAt';

/** Reads a React component's hook names off its original, once its function's original is known (`locateComponent`). */
export async function nameHooks(component: InspectedComponent): Promise<void> {
  const location = component.framework === 'react' ? component.chain[component.depth]?.location : null;
  if (location) await nameHooksAt(location);
}
