// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import type { ReactNode } from 'react';

export function Highlighted({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>;
  const hits = new Set(indices);
  const parts: ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const hit = hits.has(i);
    let j = i;
    while (j < text.length && hits.has(j) === hit) j++;
    parts.push(
      hit ? (
        <mark key={i} className="bg-transparent font-medium text-accent">
          {text.slice(i, j)}
        </mark>
      ) : (
        text.slice(i, j)
      ),
    );
    i = j;
  }
  return <>{parts}</>;
}
