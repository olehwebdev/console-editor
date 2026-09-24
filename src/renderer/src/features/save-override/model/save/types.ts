/** A tab's running save, the model version it sends, and the one save queued behind it. */
export interface SaveJob {
  task: Promise<void>;
  version: number | undefined;
  next?: Promise<void>;
}
