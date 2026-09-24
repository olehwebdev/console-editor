/**
 * The version already announced this run: a periodic check finding it again
 * stays quiet. Mutated in place (importers can't reassign another module's bindings).
 */
export const announcement: { version: string | null } = { version: null };
