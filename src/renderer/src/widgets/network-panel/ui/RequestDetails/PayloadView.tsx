import { DetailSection } from './DetailSection';
import { FieldList } from './FieldList';
import type { DetailViewProps } from './types';

/** What the request carried: its query string, and its body (pretty-printed when JSON). */
export function PayloadView({ request, detail }: DetailViewProps) {
  const query = URL.canParse(request.url) ? [...new URL(request.url).searchParams].map(([name, value]) => ({ name, value })) : [];
  if (!query.length && !request.hasBody) return <p className="text-[12px] text-fg-subtle">This request carried no query string and no body.</p>;
  return (
    <div className="flex flex-col gap-4">
      {query.length ? (
        <DetailSection title="Query string">
          <FieldList fields={query} empty="" />
        </DetailSection>
      ) : null}
      {request.hasBody ? (
        <DetailSection title="Body">
          {detail?.body === undefined ? (
            <p className="text-[12px] text-fg-subtle">The body can&apos;t be read any more.</p>
          ) : (
            <pre className="font-mono text-[12px] leading-[18px] whitespace-pre-wrap break-all text-fg select-text">{detail.body}</pre>
          )}
        </DetailSection>
      ) : null}
    </div>
  );
}
