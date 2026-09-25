import type { HeaderOperationAppliers } from './types';

/**
 * What each header operation does to a header list. Names match in any case.
 * Neither mutates the list it is given.
 */
export const HEADER_OPERATION_APPLIERS: HeaderOperationAppliers = {
  // Replaces every entry of the name with one, spelled as given; a list already holding just that one is left as it is.
  set: (headers, edit) => {
    const lower = edit.name.toLowerCase();
    const named = headers.filter((h) => h.name.toLowerCase() === lower);
    if (named.length === 1 && named[0].value === edit.value) return headers;
    return [...headers.filter((h) => h.name.toLowerCase() !== lower), { name: edit.name, value: edit.value }];
  },
  remove: (headers, edit) => {
    const lower = edit.name.toLowerCase();
    return headers.filter((h) => h.name.toLowerCase() !== lower);
  },
};
