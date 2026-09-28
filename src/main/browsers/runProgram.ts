import { execFile } from 'node:child_process';

/** What a program prints, once it exits; rejects when it fails or takes longer than `timeoutMs`. */
export function runProgram(file: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs, windowsHide: true, encoding: 'utf8' }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}
