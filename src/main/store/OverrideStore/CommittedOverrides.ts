import type { StoredOverride } from '../types';
import { WriteQueue } from '../WriteQueue';
import type { ContentFiles } from './ContentFiles';
import { readOverrides } from './readOverrides';
import { writeIndex } from './writeIndex';

/**
 * The overrides in memory, as the index file lists them. Changes run one at a
 * time, on a copy that becomes current only once the index is written: a failed
 * write never leaves a half-applied override.
 */
export class CommittedOverrides {
  private current = new Map<string, StoredOverride>();
  private readonly writes = new WriteQueue();

  constructor(private readonly indexPath: string) {}

  /** Reads the index, and each override's content from `files`. */
  async load(files: ContentFiles): Promise<void> {
    const loaded = await readOverrides(this.indexPath, files);
    // No index yet: nothing saved.
    if (loaded) this.current = loaded;
  }

  get(id: string): StoredOverride | undefined {
    return this.current.get(id);
  }

  all(): StoredOverride[] {
    return [...this.current.values()];
  }

  /**
   * Applies `change` to a copy of the overrides (it may write content files),
   * writes the index, and only then makes the copy current. Runs one at a time.
   */
  mutate<T>(change: (overrides: Map<string, StoredOverride>) => Promise<T>): Promise<T> {
    return this.writes.run(async () => {
      const next = new Map(this.current);
      const result = await change(next);
      await writeIndex(this.indexPath, next);
      this.current = next;
      return result;
    });
  }

  /** As `mutate`, but when `change` answers false nothing is written and the overrides stay as they were. */
  mutateIf(change: (overrides: Map<string, StoredOverride>) => Promise<boolean>): Promise<boolean> {
    return this.writes.run(async () => {
      const next = new Map(this.current);
      if (!(await change(next))) return false;
      await writeIndex(this.indexPath, next);
      this.current = next;
      return true;
    });
  }
}
