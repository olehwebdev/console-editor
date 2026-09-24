import { sessionSync } from './sessionSync';

export function track(write: Promise<unknown>): void {
  sessionSync.writes.add(write);
  const done = () => sessionSync.writes.delete(write);
  write.then(done, done);
}
