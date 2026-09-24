import { MAX_CONSOLE_ENTRIES } from '../../../shared/constants';
import type { AppEvent, ConsoleEntry, ConsoleFrame } from '../../../shared/types';
import { CONSOLE_BATCH_MS } from '../constants';

/** Sends new rows and frame changes to the renderer in batches, `CONSOLE_BATCH_MS` apart. */
export class BatchSender {
  /** Rows not yet sent. */
  private pending: ConsoleEntry[] = [];
  private framesDirty = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly send: (event: AppEvent) => void,
    private readonly listFrames: () => ConsoleFrame[],
  ) {}

  /** A new row for the next batch; only the most recent `MAX_CONSOLE_ENTRIES` wait. */
  rowAdded(row: ConsoleEntry): void {
    this.pending.push(row);
    if (this.pending.length > MAX_CONSOLE_ENTRIES) this.pending.splice(0, this.pending.length - MAX_CONSOLE_ENTRIES);
    this.schedule();
  }

  /** What `listFrames` returns changed: the next batch sends it. */
  framesChanged(): void {
    this.framesDirty = true;
    this.schedule();
  }

  /** Drops the rows not yet sent. */
  clear(): void {
    this.pending = [];
  }

  /** Sends what is waiting now, instead of at the end of the batch. */
  flush(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    // Frames first: new rows may come from a frame the renderer doesn't know yet.
    if (this.framesDirty) {
      this.framesDirty = false;
      this.send({ type: 'frames-changed', frames: this.listFrames() });
    }
    if (this.pending.length) {
      const entries = this.pending;
      this.pending = [];
      this.send({ type: 'console-entries', entries });
    }
  }

  private schedule(): void {
    this.timer ??= setTimeout(() => this.flush(), CONSOLE_BATCH_MS);
  }
}
