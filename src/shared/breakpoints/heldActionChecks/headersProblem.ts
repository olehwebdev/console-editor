import { headerEditSchema, MAX_HEADER_EDITS } from '../../rules';
import type { HeaderEdit } from '../../types';
import { firstIssue } from '../../validation';

/** A list of header changes' problem, or null (each checked as a header rule's). */
export function headersProblem(headers: HeaderEdit[]): string | null {
  if (!Array.isArray(headers)) return 'Header changes are a list';
  if (headers.length > MAX_HEADER_EDITS) return `At most ${MAX_HEADER_EDITS} header changes`;
  for (const edit of headers) {
    const problem = edit && typeof edit === 'object' ? firstIssue(headerEditSchema, edit) : 'A header change is an operation, a name and a value';
    if (problem) return problem;
  }
  return null;
}
