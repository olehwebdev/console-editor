import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintableFile } from '../../scripts/agent-hooks/lintableFile';

const root = resolve(__dirname, '../..');
/** A script git ignores: an installed package's. */
const installed = createRequire(import.meta.url).resolve('vitest');

describe("Claude Code's lint hook", () => {
  it('lints scripts in the project, by their path from its root', () => {
    expect(lintableFile(root, resolve(root, 'src/main/index.ts'))).toBe('src/main/index.ts');
    expect(lintableFile(root, 'scripts/check-structure.ts')).toBe('scripts/check-structure.ts');
  });

  it('leaves alone other files, files outside the project, ignored and missing ones', () => {
    expect(lintableFile(root, undefined)).toBeUndefined();
    expect(lintableFile(root, resolve(root, 'README.md'))).toBeUndefined();
    expect(lintableFile(root, resolve(root, '../elsewhere.ts'))).toBeUndefined();
    expect(lintableFile(root, installed)).toBeUndefined();
    expect(lintableFile(root, resolve(root, 'src/missing.ts'))).toBeUndefined();
  });
});
