/** Runs one task at a time: one started while another runs is dropped (a double click must not start two). */
export class OneAtATime {
  private busy: Promise<unknown> | null = null;

  async run(task: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    const run = task();
    this.busy = run;
    try {
      await run;
    } finally {
      this.busy = null;
    }
  }
}
