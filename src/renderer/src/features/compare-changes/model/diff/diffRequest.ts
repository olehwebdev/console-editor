/**
 * `generation` is bumped by every diff request, tab switch and closed diff. A
 * fetch that resolves after that belongs to a request the user moved away
 * from. Mutated in place (importers can't reassign another module's bindings).
 */
export const diffRequest = { generation: 0 };
