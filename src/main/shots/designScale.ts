/** `@2x`, `@3x` in a file name: the scale it was exported at. */
const SCALE_IN_NAME = /@([1-4])x\b/i;

/** A design wider than this is taken as a 2× export (no screen's page is that wide at 1×). */
const WIDE_AT_1X = 2000;

/** How many image pixels a design has per CSS pixel: as its name says (`hero@2x.png`), else 2 for a very wide one, else 1. */
export function designScale(name: string, width: number): number {
  const named = SCALE_IN_NAME.exec(name);
  if (named) return Number(named[1]);
  return width > WIDE_AT_1X ? 2 : 1;
}
