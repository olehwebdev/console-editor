import { offeredUpdate } from './offeredUpdate';
import type { UpdateStore } from './types';

/** The release on offer, while there is one (also after its download failed, to try again). */
export const selectOfferedUpdate = (s: UpdateStore) => offeredUpdate(s.state);
