import type { ResourceEntry } from '@common/types';

/** One change to the list, as the main process reported it. */
export type ResourceOp =
  | { type: 'add'; entry: ResourceEntry }
  /** Top-level navigation: everything goes. */
  | { type: 'reset' }
  /** A cross-site iframe navigated or went away: drop what it reported. */
  | { type: 'drop-iframe'; iframeId: string };

export type ResourceOpType = ResourceOp['type'];

/** The member of ResourceOp whose `type` is `T`. */
export type ResourceOpOf<T extends ResourceOpType> = Extract<ResourceOp, { type: T }>;

/** One applier per op type, given its own member: a new ResourceOp fails typecheck until it has one. */
export type ResourceOpAppliers = { [T in ResourceOpType]: (byKey: Record<string, ResourceEntry>, op: ResourceOpOf<T>) => Record<string, ResourceEntry> };

export interface ResourceStore {
  byKey: Record<string, ResourceEntry>;
  /** Top-level navigation: everything goes. */
  reset(): void;
  add(entry: ResourceEntry): void;
  addMany(entries: ResourceEntry[]): void;
  /** A cross-site iframe navigated or went away: drop what it reported. */
  dropIframe(iframeId: string): void;
  /** Applies changes in order as one update (a page load reports thousands of files). */
  apply(ops: readonly ResourceOp[]): void;
}
