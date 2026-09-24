import { execFile } from 'node:child_process';

/** A package manager query that takes longer counts as failed. */
const COMMAND_TIMEOUT_MS = 10_000;

export function succeeds(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: COMMAND_TIMEOUT_MS }, (err) => resolve(!err));
  });
}
