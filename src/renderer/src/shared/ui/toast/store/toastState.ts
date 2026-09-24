import type { ToastRecord } from './types';

/** The toasts on screen and the stacks that can show them. Mutated in place (importers can't reassign another module's bindings). */
export const toastState: {
  toasts: readonly ToastRecord[];
  seed: number;
  listeners: Set<() => void>;
  /**
   * Mounted <ToastStack/> instances. Only the first to register (effect order:
   * children before parents) renders; the others render nothing. Mount one.
   */
  hosts: number[];
  hostSeed: number;
  hostListeners: Set<() => void>;
} = {
  toasts: [],
  seed: 0,
  listeners: new Set(),
  hosts: [],
  hostSeed: 0,
  hostListeners: new Set(),
};
