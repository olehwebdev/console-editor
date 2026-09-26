import { readFileSync } from 'node:fs';
import type { HookInput } from './types.ts';

/** STDIN, where Claude Code writes a hook's input. */
const STDIN = 0;

/** The JSON Claude Code writes to a hook's stdin, or nothing when it wrote none (a hook run by hand). */
export function readHookInput(): HookInput {
  const text = readFileSync(STDIN, 'utf8').trim();
  const input: unknown = text ? JSON.parse(text) : {};
  return input && typeof input === 'object' ? input : {};
}
