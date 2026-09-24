/**
 * The preview's address bar, while it is shown (there is one page). Mutated in
 * place (importers can't reassign another module's bindings).
 */
export const addressBar: { current: HTMLInputElement | null } = { current: null };
