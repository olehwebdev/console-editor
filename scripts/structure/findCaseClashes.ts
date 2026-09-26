import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { caseClashes } from './caseClashes.ts';
import { CASE_CHECKED_ROOTS } from './constants.ts';
import type { Violation } from './types.ts';

/** Every group of names under the checked folders that macOS and Windows can't tell apart, one violation each. */
export function findCaseClashes(root: string): Violation[] {
  const violations: Violation[] = [];
  const visit = (dir: string) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const names of caseClashes(entries.map((entry) => ({ name: entry.name, directory: entry.isDirectory() })))) {
      const detail = `${names.join(', ')}: macOS and Windows ignore case, so they take one for the other (an import may load the wrong one): rename one`;
      violations.push({ file: relative(root, dir), rule: 'no case clashes', detail });
    }
    for (const entry of entries) if (entry.isDirectory()) visit(join(dir, entry.name));
  };
  for (const dir of CASE_CHECKED_ROOTS) visit(join(root, dir));
  return violations;
}
