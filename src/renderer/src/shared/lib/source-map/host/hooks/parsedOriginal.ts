import type { ParsedOriginal } from './types';

/** The last original parsed, shared by `parseOriginal`'s calls. */
export const parsedOriginal: ParsedOriginal = { url: null, content: null, file: null };
