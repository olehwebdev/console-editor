import type { InspectedComponent } from '@common/types';

/**
 * What follows a component shown, besides showing it: tracing its code to the originals and revealing it in the
 * Components tree, other features' work, which the app wires in at startup (`startBridge`). Mutated in place.
 */
export const followUp: { component?: (component: InspectedComponent) => void } = {};
