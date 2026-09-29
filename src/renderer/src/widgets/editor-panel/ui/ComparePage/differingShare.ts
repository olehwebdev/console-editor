/** How much of an image differs, as a share a person reads: `0%`, `< 0.01%`, `12.4%`. */
export function differingShare(differing: number, total: number): string {
  if (!differing || !total) return '0%';
  const share = (differing / total) * 100;
  if (share < 0.01) return '< 0.01%';
  return `${share < 10 ? share.toFixed(2) : share.toFixed(1)}%`;
}
