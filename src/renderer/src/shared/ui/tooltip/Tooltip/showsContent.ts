// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ReactNode } from 'react';

/** Whether `content` renders anything as the tooltip's text. */
export function showsContent(content: ReactNode): boolean {
  return content !== null && content !== undefined && content !== false && content !== '';
}
