import type { ConsoleProperty } from '@common/types';
import { ValueView } from './ValueView';

export interface PropertyListProps {
  /** null while loading. */
  expansion: { properties: ConsoleProperty[] } | { error: string } | null;
}

/** One level of an object's properties, under it; each value opens in turn. */
export function PropertyList({ expansion }: PropertyListProps) {
  if (!expansion) return <span className="ml-4 text-fg-subtle">…</span>;
  if ('error' in expansion) return <span className="ml-4 text-fg-subtle">{expansion.error}</span>;
  if (!expansion.properties.length) return <span className="ml-4 text-fg-subtle">No properties</span>;
  return (
    <ul className="ml-1.5 border-l border-line pl-2.5">
      {expansion.properties.map((p, index) => (
        // Names repeat only in odd objects (a getter beside its field); the index keeps keys apart. The list never reorders.
        <li key={`${index}:${p.name}`} className="flex min-w-0 gap-1">
          <span className="shrink-0 text-fg-muted">{p.name}:</span>
          <ValueView value={p.value} />
        </li>
      ))}
    </ul>
  );
}
