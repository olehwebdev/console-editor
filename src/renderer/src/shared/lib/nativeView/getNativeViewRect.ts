import { nativeViewRect } from './nativeViewRect';
import type { NativeViewRect } from './types';

/** The rect floating UI must stay off (or freeze the page over), or null. */
export function getNativeViewRect(): NativeViewRect | null {
  return nativeViewRect.current;
}
