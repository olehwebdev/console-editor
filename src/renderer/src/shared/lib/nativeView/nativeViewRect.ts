import type { NativeViewRect } from './types';

/*
 * The website is a native view drawn above the renderer, so anything floating
 * that lands on it is invisible. The page preview reports where the view sits;
 * tooltips (too frequent to freeze the page for) place themselves around it,
 * and editor widgets that can't (Monaco hovers, suggestions) freeze the page
 * while they overlap it. Mutated in place (importers can't reassign another
 * module's bindings).
 */
export const nativeViewRect: { current: NativeViewRect | null } = { current: null };
