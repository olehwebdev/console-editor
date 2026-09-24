import { parseVersion } from './parseVersion';

/** A numeric pre-release identifier: compared as a number, and sorted before alphanumeric ones. */
const NUMERIC_IDENTIFIER = /^\d+$/;

/** Negative when `a` is older than `b`, positive when newer, 0 when equal. Unparseable versions sort first. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return pa ? 1 : pb ? -1 : 0;
  for (let i = 0; i < pa.core.length; i++) {
    if (pa.core[i] !== pb.core[i]) return pa.core[i] - pb.core[i];
  }
  // A pre-release comes before its release: 1.0.0-rc.1 < 1.0.0.
  if (!pa.pre.length || !pb.pre.length) return pb.pre.length - pa.pre.length;
  for (let i = 0; i < Math.max(pa.pre.length, pb.pre.length); i++) {
    const x = pa.pre[i];
    const y = pb.pre[i];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const nx = NUMERIC_IDENTIFIER.test(x);
    const ny = NUMERIC_IDENTIFIER.test(y);
    if (nx && ny) return Number(x) - Number(y);
    if (nx !== ny) return nx ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}
