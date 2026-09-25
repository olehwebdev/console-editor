import type { ConsoleLocation } from '@common/types';
import { fileName } from '@/shared/lib';
import { openResource } from '@/features/open-resource';

/** Where a row was logged from, as `cart.js:12`; opens the file in an editor tab, where it can be overridden. */
export function SourceLink({ location, className }: { location: ConsoleLocation; className?: string }) {
  if (!location.url) return null;
  return (
    <button
      type="button"
      title={`${location.url}:${location.line}:${location.column}`}
      onClick={() => void openResource(location.url)}
      className={className ?? 'shrink-0 truncate text-fg-subtle underline-offset-2 outline-none hover:text-fg-muted hover:underline focus-visible:underline'}
    >
      {fileName(location.url)}:{location.line}
    </button>
  );
}
