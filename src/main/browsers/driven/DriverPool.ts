import type { Driver } from './types';

/** The drivers of the browsers driven now, by key, and the ones still connecting: each connected once. */
export class DriverPool {
  private readonly drivers = new Map<string, Driver>();
  private readonly starting = new Map<string, Promise<Driver>>();

  all(): Driver[] {
    return [...this.drivers.values()];
  }

  get size(): number {
    return this.drivers.size;
  }

  get(key: string): Driver {
    const driver = this.drivers.get(key);
    if (!driver) throw new Error("That browser isn't open with your changes any more");
    return driver;
  }

  /** The driver for `key`: connected, still connecting, or connected now by `start`. */
  reach(key: string, start: () => Promise<Driver>): Promise<Driver> {
    const driver = this.drivers.get(key);
    if (driver) return Promise.resolve(driver);
    const starting =
      this.starting.get(key) ??
      start()
        .then((started) => {
          this.drivers.set(key, started);
          return started;
        })
        .finally(() => this.starting.delete(key));
    this.starting.set(key, starting);
    return starting;
  }

  remove(key: string): void {
    this.drivers.delete(key);
  }

  /** Forgets every driver, and returns them. */
  clear(): Driver[] {
    const all = this.all();
    this.drivers.clear();
    return all;
  }
}
