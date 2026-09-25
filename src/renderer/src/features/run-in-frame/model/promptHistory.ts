/**
 * The code you ran, per workspace, oldest first: read from localStorage the
 * first time it is needed. Mutated in place (importers can't reassign another
 * module's bindings).
 */
export const promptHistory = { byWorkspace: new Map<string, string[]>() };
