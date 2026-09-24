// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { Ref } from 'react';

/** Sets a callback or object ref, as React would. */
export function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}
