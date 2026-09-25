/** The source-map worker and the requests it owes answers for. Mutated in place (importers can't reassign another module's bindings). */
export const workerState: {
  worker: Worker | null;
  pending: Map<number, { resolve(reply: unknown): void; reject(err: Error): void }>;
  idleTimer: ReturnType<typeof setTimeout> | undefined;
  nextId: number;
} = {
  worker: null,
  pending: new Map(),
  idleTimer: undefined,
  nextId: 1,
};
