import type { IfStatement, Node } from '@babel/types';
import { comparedSubject } from './comparedSubject.ts';

/** What each `if` of an if/else-if chain compares with a literal. */
export function ifChainSubjects(first: IfStatement, source: string): string[] {
  const subjects: string[] = [];
  for (let current: Node | null | undefined = first; current?.type === 'IfStatement'; current = current.alternate) {
    const subject = comparedSubject(current.test, source);
    if (subject) subjects.push(subject);
  }
  return subjects;
}
