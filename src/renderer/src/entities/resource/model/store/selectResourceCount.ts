import { selectUniqueResources } from './selectUniqueResources';
import type { ResourceStore } from './types';

export const selectResourceCount = (s: ResourceStore) => selectUniqueResources(s).length;
