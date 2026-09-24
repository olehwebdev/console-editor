import type { ReactNode } from 'react';

export function plainText(node: ReactNode): string {
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}
