import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Shot } from '../../../shared/types';
import { WriteQueue } from '../WriteQueue';
import { cleanShotName } from './cleanShotName';
import { MAX_SHOT_BYTES, MAX_SHOTS, SHOTS_DIR, SHOTS_FILE } from './constants';
import { newShotId } from './newShotId';
import { readShots } from './readShots';
import { removeShotFiles } from './removeShotFiles';
import { shotFiles } from './shotFiles';
import { toShot } from './toShot';
import type { NewShot, StoredShot } from './types';
import { uniqueShotName } from './uniqueShotName';
import { writeShots } from './writeShots';

/**
 * Captures and designs, kept with their workspace:
 *
 *   <dir>/shots.json               every workspace's shots' records
 *   <dir>/shots/<id>.<png|jpg|webp> each one's image, and <id>.thumb.jpg its thumbnail
 *
 * `list` covers the active workspace's, and `add` adds to it; the others reach any shot, so a change
 * in flight when the workspace changes lands where it began. Records change one at a time, on a copy
 * that becomes current once written; an image is written before its record and removed after it.
 */
export class ShotStore {
  private workspaceId = '';
  private current: StoredShot[] = [];
  private readonly writes = new WriteQueue();
  private readonly path: string;
  private readonly files: string;

  constructor(dir: string) {
    this.path = join(dir, SHOTS_FILE);
    this.files = join(dir, SHOTS_DIR);
  }

  async load(): Promise<void> {
    this.current = await readShots(this.path);
  }

  setWorkspace(id: string): void {
    this.workspaceId = id;
  }

  /** The active workspace's shots, newest first. */
  list(): Shot[] {
    return this.current
      .filter((s) => s.workspaceId === this.workspaceId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toShot);
  }

  /** A shot of any workspace. */
  get(id: unknown): Shot {
    return toShot(this.find(id));
  }

  /** Where a shot's image and thumbnail are. */
  paths(id: unknown): { image: string; thumb: string } {
    return shotFiles(this.files, this.find(id));
  }

  read(id: unknown): Promise<Buffer> {
    return readFile(shotFiles(this.files, this.find(id)).image);
  }

  /** Keeps a new shot in the workspace active now, under a name no other of its shots has. */
  add({ bytes, thumb, ...fields }: NewShot): Promise<Shot> {
    const { workspaceId } = this;
    if (bytes.length > MAX_SHOT_BYTES) return Promise.reject(new Error(`An image can be at most ${MAX_SHOT_BYTES / 1024 / 1024} MB`));
    return this.mutate(async (shots) => {
      const own = shots.filter((s) => s.workspaceId === workspaceId);
      if (own.length >= MAX_SHOTS) throw new Error(`A workspace keeps at most ${MAX_SHOTS} captures and designs`);
      const id = newShotId(shots);
      const name = uniqueShotName(cleanShotName(fields.name) ?? `${id}.${fields.ext}`, new Set(own.map((s) => s.name)));
      const now = Date.now();
      const shot: StoredShot = { ...fields, id, name, workspaceId, createdAt: now, updatedAt: now };
      const files = shotFiles(this.files, shot);
      await mkdir(this.files, { recursive: true });
      await writeFile(files.image, bytes);
      if (thumb) await writeFile(files.thumb, thumb);
      shots.push(shot);
      return toShot(shot);
    });
  }

  rename(id: unknown, name: unknown): Promise<Shot> {
    const clean = cleanShotName(name);
    if (!clean) return Promise.reject(new Error('Give it a name'));
    return this.patch(id, { name: clean }, (shot, shots) => {
      if (shots.some((s) => s.workspaceId === shot.workspaceId && s.id !== shot.id && s.name === clean)) throw new Error(`Another has the name ${clean}`);
    });
  }

  /** Changes how many device pixels a design has per CSS pixel. */
  setScale(id: unknown, scale: unknown): Promise<Shot> {
    if (typeof scale !== 'number' || !(scale > 0 && scale <= 16)) return Promise.reject(new Error('Invalid scale'));
    return this.patch(id, { scale });
  }

  async remove(id: unknown): Promise<void> {
    const gone = await this.mutate((shots) => shots.splice(this.indexIn(shots, id), 1));
    await removeShotFiles(this.files, gone);
  }

  /** Deletes every shot of a workspace. */
  async removeWorkspace(workspaceId: string): Promise<void> {
    if (!this.current.some((s) => s.workspaceId === workspaceId)) return;
    const gone = await this.mutate((shots) => {
      const kept = shots.filter((s) => s.workspaceId !== workspaceId);
      return shots.splice(0, shots.length, ...kept).filter((s) => s.workspaceId === workspaceId);
    });
    await removeShotFiles(this.files, gone);
  }

  /** Changes fields of a shot, once `check` (given it and every shot) has let it. */
  private patch(id: unknown, fields: Partial<StoredShot>, check?: (shot: StoredShot, shots: StoredShot[]) => void): Promise<Shot> {
    return this.mutate((shots) => {
      const index = this.indexIn(shots, id);
      check?.(shots[index], shots);
      shots[index] = { ...shots[index], ...fields, updatedAt: Date.now() };
      return toShot(shots[index]);
    });
  }

  private find(id: unknown): StoredShot {
    return this.current[this.indexIn(this.current, id)];
  }

  private indexIn(shots: StoredShot[], id: unknown): number {
    const index = shots.findIndex((s) => s.id === id);
    if (index < 0) throw new Error('That capture or design no longer exists');
    return index;
  }

  /** Applies `change` to a copy of every record, writes it, and only then makes it current. Runs one at a time. */
  private mutate<T>(change: (shots: StoredShot[]) => T | Promise<T>): Promise<T> {
    return this.writes.run(async () => {
      const next = [...this.current];
      const result = await change(next);
      await writeShots(this.path, next);
      this.current = next;
      return result;
    });
  }
}
