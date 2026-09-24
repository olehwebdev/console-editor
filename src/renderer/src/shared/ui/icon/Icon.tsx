import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import type { SVGProps } from 'react';
import { cn } from '@/shared/lib';

export type IconGlyph = IconSvgElement;

/** The design system's glyph: control size and a 1.5 px stroke. */
const DEFAULT_SIZE = 16;
const DEFAULT_STROKE = 1.5;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  icon: IconGlyph;
  /** 14 inline, 16 controls (default), 18 activity rail. */
  size?: number;
  strokeWidth?: number;
}

/** Hugeicons glyph with the design-system defaults (1.5 px stroke, currentColor). */
export function Icon({ icon, size = DEFAULT_SIZE, strokeWidth = DEFAULT_STROKE, className, ...rest }: IconProps) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} className={cn('shrink-0', className)} aria-hidden {...rest} />;
}
