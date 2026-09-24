/** The format worker and the jobs it owes answers for. Mutated in place (importers can't reassign another module's bindings). */
export const workerState: {
  worker: Worker | null;
  pending: Map<number, { resolve(text: string): void; reject(err: Error): void }>;
  idleTimer: ReturnType<typeof setTimeout> | undefined;
} = {
  worker: null,
  pending: new Map(),
  idleTimer: undefined,
};
