import { perVersion } from './perVersion';

/** Distinct iframes that loaded files. */
export const selectIframeCount = perVersion((byKey) => new Set(Object.values(byKey).flatMap((e) => (e.frame ? [e.frame.url] : []))).size);
