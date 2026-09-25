/** The window's address bar. Mutated in place (importers can't reassign another module's bindings). */
export const addressBar: { current: HTMLInputElement | null } = { current: null };
