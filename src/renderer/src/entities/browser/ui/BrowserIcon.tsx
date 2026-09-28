import type { BrowserInfo } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';

export interface BrowserIconProps {
  browser: Pick<BrowserInfo, 'icon' | 'name'>;
  /** Its side, in pixels (16 by default). */
  size?: number;
  className?: string;
}

/** A browser's icon from the system, or a plain browser glyph when the system gives none. */
export function BrowserIcon({ browser, size = 16, className }: BrowserIconProps) {
  if (!browser.icon) return <Icon icon={icons.BrowserIcon} size={size} className={cn('text-fg-muted', className)} />;
  return <img src={browser.icon} alt="" width={size} height={size} draggable={false} className={cn('shrink-0 object-contain', className)} />;
}
