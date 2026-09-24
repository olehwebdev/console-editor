/** Runs tasks one after another; a task that fails doesn't stop the ones queued after it. */
export class SerialQueue {
  private tail: Promise<void> = Promise.resolve();

  run(task: () => Promise<void>): Promise<void> {
    const run = this.tail.then(task);
    this.tail = run.catch(() => undefined);
    return run;
  }
}
