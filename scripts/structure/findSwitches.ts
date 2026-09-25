import type { File } from '@babel/types';
import { ifChainSubjects } from './ifChainSubjects.ts';
import { repeatedSubject } from './repeatedSubject.ts';
import { ternarySubjects } from './ternarySubjects.ts';
import { walkAst } from './walkAst.ts';

/**
 * `switch` statements, and what counts as one (CLAUDE.md › No `switch`): an
 * if/else chain or a nested ternary comparing one value with literals.
 */
export function findSwitches(ast: File, source: string): Array<{ line: number; detail: string }> {
  const found: Array<{ line: number; detail: string }> = [];
  walkAst(ast, (node, parent) => {
    const line = node.loc?.start.line ?? 0;
    if (node.type === 'SwitchStatement') found.push({ line, detail: 'switch statement: dispatch through a typed table' });
    const chainStart = node.type === 'IfStatement' && !(parent?.type === 'IfStatement' && parent.alternate === node);
    const ternaryStart = node.type === 'ConditionalExpression' && parent?.type !== 'ConditionalExpression';
    const subjects = chainStart ? ifChainSubjects(node, source) : ternaryStart ? ternarySubjects(node, source) : [];
    const subject = repeatedSubject(subjects);
    if (subject) found.push({ line, detail: `${chainStart ? 'if/else chain' : 'nested ternary'} over \`${subject}\`: use a typed table` });
  });
  return found;
}
