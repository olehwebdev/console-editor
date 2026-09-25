import { perVersion } from './perVersion';

/** Distinct workers that loaded files. */
export const selectWorkerCount = perVersion((byKey) => new Set(Object.values(byKey).flatMap((e) => (e.workerId ? [e.workerId] : []))).size);
