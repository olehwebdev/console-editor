import type { File } from '@babel/types';
import { functionsDeclaredBy } from './functionsDeclaredBy.ts';
import type { TopLevelFunction } from './types.ts';

/** The functions, components and classes declared at a file's top level (exported or not). */
export function topLevelFunctions(ast: File): TopLevelFunction[] {
  return ast.program.body.flatMap((statement) => functionsDeclaredBy(statement).map((name) => ({ name, line: statement.loc?.start.line ?? 0 })));
}
