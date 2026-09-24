/** Runs writes one at a time, in the order they were queued; a failed write doesn't stop the ones after it. */
export class WriteQueue {
  private tail: Promise<void> = Promise.resolve();

  /** Runs `write` once every write queued before it has settled; settles as `write` does. */
  run<T>(write: () => Promise<T>): Promise<T> {
    const run = this.tail.then(write);
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /** Settles once every write queued so far has. */
  idle(): Promise<void> {
    return this.tail;
  }
}
