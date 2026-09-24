import { basename, dirname, extname } from 'node:path';
import { BARREL_NAME, DATA_FILE_NAMES, ENTRY_POINTS, MAX_LINES, SCRIPTS_DIR } from './constants.ts';
import { findSwitches } from './findSwitches.ts';
import { isReExport } from './isReExport.ts';
import { lineCount } from './lineCount.ts';
import { parseSource } from './parseSource.ts';
import { topLevelFunctions } from './topLevelFunctions.ts';
import type { Violation } from './types.ts';

/** Checks one file against CLAUDE.md › Code structure. `file` is its path from the repository root. */
export function checkFile(file: string, text: string): Violation[] {
  const violations: Violation[] = [];
  const report = (rule: string, detail: string, line?: number) => violations.push({ file, rule, detail, ...(line ? { line } : {}) });

  const lines = lineCount(text);
  if (lines > MAX_LINES) report('thin files', `${lines} lines, over ${MAX_LINES}: split it by concern (see the code-structure skill)`);

  const ast = parseSource(file, text);
  for (const { line, detail } of findSwitches(ast, text)) report('no switch', detail, line);

  // Entry points hold startup statements instead of one function.
  if (ENTRY_POINTS.includes(file) || dirname(file) === SCRIPTS_DIR) return violations;
  const name = basename(file, extname(file));
  const functions = topLevelFunctions(ast);
  if (DATA_FILE_NAMES.includes(name)) {
    if (functions.length) report('data files hold data', `declares ${functions.map((f) => f.name).join(', ')}: move each into a file of its own`, functions[0]!.line);
  } else if (functions.length > 1) {
    report('one function per file', `declares ${functions.map((f) => f.name).join(', ')}: give each its own file (a folder of the same name keeps imports working)`, functions[1]!.line);
  } else if (functions.length === 1 && functions[0]!.name !== name) {
    report('named after its function', `holds ${functions[0]!.name}: rename the file ${functions[0]!.name}${extname(file)}`, functions[0]!.line);
  }
  if (name === BARREL_NAME) {
    const other = ast.program.body.find((statement) => !isReExport(statement));
    if (other) report('index files re-export', `has a ${other.type}: move it into a file of its own`, other.loc?.start.line);
  }
  return violations;
}
