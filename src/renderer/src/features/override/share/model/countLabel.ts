/** `1 override`, `3 rules`: a count and its noun. */
export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
