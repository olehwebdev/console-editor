import { useState } from 'react';
import { MessageRow } from './MessageRow';
import type { DetailViewProps } from './types';
import { useSocketMessages } from './useSocketMessages';

/** A WebSocket's messages, oldest first, as they come; one opens to show all of it. Read-only: they can't be changed or held. */
export function MessagesView({ request }: DetailViewProps) {
  const read = useSocketMessages(request);
  // Numbered like the messages themselves (every one the socket had), so it survives new ones coming.
  const [open, setOpen] = useState<number | null>(null);
  const note = (text: string) => <p className="text-[12px] text-fg-subtle">{text}</p>;
  if (!read) return note('Reading the messages…');
  if (read.error) return note(read.error);
  if (!read.list.length) return note('No messages yet.');
  const first = read.next - read.list.length;
  return (
    <ol aria-label="Messages" data-testid="network-messages" className="-mx-1 flex flex-col font-mono text-[12px] leading-[18px]">
      {read.list.map((message, i) => (
        <MessageRow key={first + i} message={message} open={open === first + i} onToggle={() => setOpen(open === first + i ? null : first + i)} />
      ))}
    </ol>
  );
}
