import { CallStack } from '@/features/open-resource';
import { DetailSection } from './DetailSection';
import { FieldList } from './FieldList';
import type { DetailViewProps } from './types';

/** What was asked and answered: the request's facts and the script that sent it, then the response's headers and the request's. */
export function HeadersView({ request, detail }: DetailViewProps) {
  const general = [
    { name: 'URL', value: request.url },
    { name: 'Method', value: request.method },
    { name: 'Status', value: request.status ? `${request.status} ${detail?.statusText ?? ''}`.trim() : request.state },
    { name: 'Type', value: request.type },
    ...(request.error ? [{ name: 'Error', value: request.error }] : []),
    ...(request.operation ? [{ name: 'GraphQL operation', value: request.operation }] : []),
    ...(request.overrideId ? [{ name: 'Answered by', value: 'An override' }] : []),
    ...(request.fromServiceWorker ? [{ name: 'Answered by', value: 'The service worker' }] : []),
    ...(request.fromCache ? [{ name: 'Answered by', value: 'The HTTP cache' }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <DetailSection title="General">
        <FieldList fields={general} empty="" />
      </DetailSection>
      {request.initiator ? (
        <DetailSection title="Sent by">
          <CallStack stack={request.initiator} />
        </DetailSection>
      ) : null}
      <DetailSection title="Response headers">
        <FieldList fields={detail?.responseHeaders ?? []} empty={request.state === 'pending' ? 'Waiting for the response…' : 'None.'} />
      </DetailSection>
      <DetailSection title="Request headers">
        <FieldList fields={detail?.requestHeaders ?? []} empty="None." />
      </DetailSection>
    </div>
  );
}
