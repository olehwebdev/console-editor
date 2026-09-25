import { BODY_GAP_TEXT } from '@/features/open-resource';
import type { DetailViewProps } from './types';
import { useResponseBody } from './useResponseBody';

/** The longest body shown here, in characters: a bigger one opens in full in an editor tab. */
const MAX_SHOWN_CHARS = 200_000;

/** What the page got back, pretty-printed when JSON; read once the request has ended. */
export function ResponseView({ request }: DetailViewProps) {
  const result = useResponseBody(request);
  const note = (text: string) => <p className="text-[12px] text-fg-subtle">{text}</p>;
  if (request.state === 'pending') return note(BODY_GAP_TEXT.pending);
  if (!result) return note('Reading the response…');
  if (result.error) return note(result.error);
  const body = result.value!;
  if (!body.available) return note(BODY_GAP_TEXT[body.gap]);
  if (body.binary) return note('A binary response: it isn’t shown here.');
  if (!body.text) return note('The response was empty.');
  const cut = body.text.length > MAX_SHOWN_CHARS;
  return (
    <div className="flex flex-col gap-2">
      <pre data-testid="network-response" className="font-mono text-[12px] leading-[18px] whitespace-pre-wrap break-all text-fg select-text">
        {cut ? body.text.slice(0, MAX_SHOWN_CHARS) : body.text}
      </pre>
      {cut ? note('The rest is cut off here.') : null}
    </div>
  );
}
