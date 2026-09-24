/** Answers are remembered per origin and permission. */
export function decisionKey(origin: string, permission: string): string {
  return `${origin}|${permission}`;
}
