import type { CodeLocation } from '@common/types';
import { codeLabel, locationKey, useInspectorStore } from '@/entities/inspector';
import { openCode } from './openCode';

/** Where a function is defined, as a link: its original's file and line once known, else the bundle's. */
export function CodeLink({ location }: { location: CodeLocation | null }) {
  const origin = useInspectorStore((s) => (location ? s.origins[locationKey(location)] : undefined));
  if (!location) return null;
  return (
    <button
      type="button"
      title={origin?.url ?? location.url}
      onClick={() => openCode(location, origin)}
      className="max-w-[45%] shrink-0 truncate rounded font-mono text-[12px] text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      data-testid="code-link"
    >
      {codeLabel(location, origin)}
    </button>
  );
}
