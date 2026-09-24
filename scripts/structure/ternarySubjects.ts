import type { Node } from '@babel/types';
import { comparedSubject } from './comparedSubject.ts';

/** What each condition of a (nested) ternary compares with a literal. */
export function ternarySubjects(node: Node, source: string): string[] {
  if (node.type !== 'ConditionalExpression') return [];
  const own = comparedSubject(node.test, source);
  return [...(own ? [own] : []), ...ternarySubjects(node.consequent, source), ...ternarySubjects(node.alternate, source)];
}
