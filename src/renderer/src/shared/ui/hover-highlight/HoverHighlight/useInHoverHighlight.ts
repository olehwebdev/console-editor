// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { useContext } from 'react';
import { InHoverHighlight } from './InHoverHighlight';

/**
 * True inside a <HoverHighlight>. Rows use it to drop their own `:hover`
 * background, since the moving pill already draws it.
 */
export function useInHoverHighlight(): boolean {
  return useContext(InHoverHighlight);
}
