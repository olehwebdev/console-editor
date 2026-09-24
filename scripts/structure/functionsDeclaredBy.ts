import type { Statement } from '@babel/types';
import { isFunctionValue } from './isFunctionValue.ts';

/** The name used for an anonymous default export. */
const DEFAULT_NAME = 'default';

/** Handlers for the statements that can declare a function, each given its own kind of statement. */
type Declarers = { [T in Statement['type']]?: (statement: Extract<Statement, { type: T }>) => string[] };

/** What each kind of top-level statement declares, by name; other statements declare none. */
const DECLARERS: Declarers = {
  // A body-less declaration is an overload signature, not a function of its own.
  FunctionDeclaration: (s) => (s.body ? [s.id?.name ?? DEFAULT_NAME] : []),
  ClassDeclaration: (s) => [s.id?.name ?? DEFAULT_NAME],
  VariableDeclaration: (s) => s.declarations.flatMap((d) => (d.id.type === 'Identifier' && isFunctionValue(d.init) ? [d.id.name] : [])),
  ExportNamedDeclaration: (s) => (s.declaration ? functionsDeclaredBy(s.declaration) : []),
  ExportDefaultDeclaration: (s) => {
    const d = s.declaration;
    if (d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') return [d.id?.name ?? DEFAULT_NAME];
    return isFunctionValue(d) ? [DEFAULT_NAME] : [];
  },
};

/** The functions, components and classes a top-level statement declares, by name. */
export function functionsDeclaredBy(statement: Statement): string[] {
  const declarer = DECLARERS[statement.type] as ((s: Statement) => string[]) | undefined;
  return declarer ? declarer(statement) : [];
}
