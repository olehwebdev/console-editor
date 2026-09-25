import type { HttpHeader } from '@common/types';

/** How many headers a held request or response carries; hovering lists them. */
export function HeaderCount({ headers, what }: { headers: readonly HttpHeader[]; what: string }) {
  return (
    <span className="shrink-0 cursor-default text-[12px] text-fg-subtle underline decoration-dotted underline-offset-2" title={headers.map((h) => `${h.name}: ${h.value}`).join('\n')}>
      {headers.length} {what} headers
    </span>
  );
}
