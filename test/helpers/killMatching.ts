import { readdirSync, readFileSync } from 'node:fs';

/** Stops every process whose command line holds `fragment` (Linux: read from /proc), this one aside. */
export function killMatching(fragment: string): void {
  for (const pid of readdirSync('/proc').filter((name) => /^\d+$/.test(name) && Number(name) !== process.pid)) {
    let command = '';
    try {
      command = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
    } catch {
      continue;
    }
    if (!command.includes(fragment)) continue;
    try {
      process.kill(Number(pid));
    } catch {
      // Gone already.
    }
  }
}
