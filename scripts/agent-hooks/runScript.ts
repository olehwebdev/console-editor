import { spawn } from 'node:child_process';
import { NO_COLOR_ENV, NPM, WINDOWS } from './constants.ts';
import type { ScriptResult } from './types.ts';

/** Runs `npm run <script> -- <args>` in `root`, without colours, and resolves with whether it passed and what it printed. */
export function runScript(root: string, script: string, args: string[] = []): Promise<ScriptResult> {
  return new Promise((done) => {
    const child = spawn(NPM, ['run', '--silent', script, ...(args.length ? ['--', ...args] : [])], {
      cwd: root,
      env: { ...process.env, ...NO_COLOR_ENV },
      shell: process.platform === WINDOWS,
    });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', (error) => done({ script, ok: false, output: error.message }));
    child.on('close', (code) => done({ script, ok: code === 0, output: output.trim() }));
  });
}
