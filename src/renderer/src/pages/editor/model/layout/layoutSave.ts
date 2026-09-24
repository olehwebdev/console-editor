/**
 * The last layout written (serialized) and the pending debounced write, shared
 * by `rememberLayout` and `save`. Mutated in place (importers can't reassign
 * another module's bindings).
 */
export const layoutSave: { lastSaved: string; timer: ReturnType<typeof setTimeout> | undefined } = {
  lastSaved: '',
  timer: undefined,
};
