import type { File } from '@babel/types';
import { FUNCTION_TYPES } from './constants';
import type { AnyNode } from './types';
import { unwrapNode } from './unwrapNode';

/** Where a custom hook is defined at the top of the same file (`function useLine(`, `const useLine = (`), exported or not. */
export function hookDefinition(file: File, name: string): AnyNode | null {
  for (const statement of file.program.body as AnyNode[]) {
    const declaration = statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration' ? (statement.declaration as AnyNode | null) : statement;
    if (!declaration) continue;
    if (declaration.type === 'FunctionDeclaration' && (declaration.id as AnyNode | null)?.name === name) return declaration;
    for (const declarator of declaration.type === 'VariableDeclaration' ? (declaration.declarations as AnyNode[]) : []) {
      const init = unwrapNode(declarator.init as AnyNode | null);
      if ((declarator.id as AnyNode).name === name && init && FUNCTION_TYPES.has(init.type)) return init;
    }
  }
  return null;
}
