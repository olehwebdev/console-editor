import type { HttpHeader } from '@common/types';

/** Names and values (headers, query parameters, the request's facts), one per line, selectable. */
export function FieldList({ fields, empty }: { fields: readonly HttpHeader[]; empty: string }) {
  if (!fields.length) return <p className="text-[12px] text-fg-subtle">{empty}</p>;
  return (
    <dl className="grid grid-cols-[minmax(96px,max-content)_1fr] gap-x-3 gap-y-0.5 font-mono text-[12px] leading-[18px] select-text">
      {fields.map((field, i) => (
        // A request's fields never change or reorder, and names can repeat (Set-Cookie).
        <div key={i} className="contents">
          <dt className="truncate text-fg-muted" title={field.name}>
            {field.name}
          </dt>
          <dd className="min-w-0 break-all text-fg">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
