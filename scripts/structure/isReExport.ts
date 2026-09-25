import type { Statement } from '@babel/types';

/** Statements a barrel (`index.ts`) may hold: imports, and exports of what other files declare. */
export function isReExport(statement: Statement): boolean {
  if (statement.type === 'ImportDeclaration' || statement.type === 'ExportAllDeclaration') return true;
  return statement.type === 'ExportNamedDeclaration' && !statement.declaration;
}
