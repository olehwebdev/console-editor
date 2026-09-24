import { perVersion } from './perVersion';
import { uniqueResources } from './uniqueResources';

/** `uniqueResources` of the current entries. */
export const selectUniqueResources = perVersion(uniqueResources);
