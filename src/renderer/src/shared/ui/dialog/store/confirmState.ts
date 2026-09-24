import type { Pending } from './types';

/** The confirm queue and its hosts. Mutated in place (importers can't reassign another module's bindings). */
export const confirmState: {
  /** Waiting requests; the head is the one on screen. */
  queue: readonly Pending[];
  seed: number;
  listeners: Set<() => void>;
  /** Mounted <ConfirmDialog/> instances; only the first to register (effect order) renders. Mount one. */
  hosts: number[];
  hostSeed: number;
} = {
  queue: [],
  seed: 0,
  listeners: new Set(),
  hosts: [],
  hostSeed: 0,
};
