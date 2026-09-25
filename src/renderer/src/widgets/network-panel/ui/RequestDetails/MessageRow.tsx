import type { SocketDirection, SocketMessage } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { formatSize } from '../NetworkPanel/formatSize';
import { formatClock } from './formatClock';

/** How each direction reads. */
const DIRECTION: Record<SocketDirection, { icon: typeof icons.FrameSentIcon; className: string; label: string }> = {
  sent: { icon: icons.FrameSentIcon, className: 'text-info', label: 'Sent' },
  received: { icon: icons.FrameReceivedIcon, className: 'text-live', label: 'Received' },
};

export interface MessageRowProps {
  message: SocketMessage;
  open: boolean;
  onToggle(): void;
}

/** One message on a line (which way, its text, size and time); opened, all of it below. */
export function MessageRow({ message, open, onToggle }: MessageRowProps) {
  const look = DIRECTION[message.direction];
  const text = message.binary ? `Binary message, ${formatSize(message.length)} (base64: ${message.data})` : message.data;
  return (
    <li className="border-b border-line/60" data-testid="network-message" data-direction={message.direction}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex h-[22px] w-full min-w-0 items-center gap-2 px-1 text-left outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40">
        <Icon icon={look.icon} size={12} className={cn('shrink-0', look.className)} aria-label={look.label} />
        <span className={cn('min-w-0 flex-1 truncate', message.binary && 'text-fg-muted')}>{text}</span>
        <span className="w-14 shrink-0 text-right tabular-nums text-fg-subtle">{formatSize(message.length)}</span>
        <span className="w-24 shrink-0 text-right tabular-nums text-fg-subtle">{formatClock(message.at)}</span>
      </button>
      {open ? (
        <pre className="whitespace-pre-wrap break-all px-6 pb-1.5 text-fg select-text">
          {text}
          {message.truncated ? <span className="block text-fg-subtle">The rest is cut off.</span> : null}
        </pre>
      ) : null}
    </li>
  );
}
