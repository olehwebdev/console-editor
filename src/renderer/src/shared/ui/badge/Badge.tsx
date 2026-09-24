import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/shared/lib';
import { Icon, type IconGlyph } from '@/shared/ui/icon';

export type BadgeTone = 'neutral' | 'live' | 'warning' | 'info' | 'accent' | 'danger';

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  /** Default `neutral`. (`danger` is an extra tone for errors.) */
  tone?: BadgeTone;
  /** Leading status dot in the tone color. */
  dot?: boolean;
  /**
   * Pulse the dot, the "currently live" signal. A ping ring animated with
   * transform/opacity only (compositor), off under reduced motion.
   */
  pulse?: boolean;
  /** Optional 12 px glyph instead of (or with) the dot. */
  icon?: IconGlyph;
}

const TONE: Record<BadgeTone, string> = {
  neutral: 'border-line bg-hover text-fg-muted',
  live: 'border-live/20 bg-live/10 text-live',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  info: 'border-info/20 bg-info/10 text-info',
  accent: 'border-accent/25 bg-accent/12 text-accent',
  danger: 'border-danger/25 bg-danger/12 text-danger',
};

/** 18 px pill label with a tone, an optional (pulsing) dot and an optional glyph. */
export function Badge({ tone = 'neutral', dot = false, pulse = false, icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex h-[18px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-1.5',
        'text-[11px] font-medium leading-none tabular-nums',
        TONE[tone],
        className,
      )}
      {...rest}
    >
      {dot ? (
        <span aria-hidden className="relative flex size-1.5 shrink-0">
          {pulse ? (
            <span className="absolute inset-0 rounded-full bg-current opacity-60 animate-ping [animation-duration:1.8s] motion-reduce:hidden" />
          ) : null}
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {icon ? <Icon icon={icon} size={12} /> : null}
      {children}
    </span>
  );
}
