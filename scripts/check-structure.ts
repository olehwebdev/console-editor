/**
 * Checks the source (src/, scripts/; tests are exempt) against CLAUDE.md ›
 * Code structure: files of at most 150 lines, one function, component, class
 * or store per file named after it, data-only constants/types/index files, and
 * no `switch` (nor if/else chains or nested ternaries over one value). Also
 * checks src/, scripts/ and test/ for names that differ only in case, which
 * macOS and Windows take for one while Linux (and CI) tell them apart.
 * Exits with 1 and lists what to fix when a file breaks a rule.
 *
 *   npm run lint:structure
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkFile } from './structure/checkFile.ts';
import { findCaseClashes } from './structure/findCaseClashes.ts';
import { sourceFiles } from './structure/sourceFiles.ts';

const root = join(import.meta.dirname, '..');
const files = sourceFiles(root);
const violations = [...files.flatMap((file) => checkFile(file, readFileSync(join(root, file), 'utf8'))), ...findCaseClashes(root)];

for (const v of violations) console.error(`${v.file}${v.line ? `:${v.line}` : ''}  ${v.rule}: ${v.detail}`);
if (violations.length) {
  console.error(`\n${violations.length} code-structure problem(s) in ${new Set(violations.map((v) => v.file)).size} of ${files.length} files.`);
  process.exit(1);
}
console.log(`Code structure: ${files.length} files OK.`);
