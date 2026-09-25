import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { sourceGlyph } from './sourceGlyph';

/** An original's language glyph, tinted like the file kinds. */
export function SourceIcon({ file, size, className }: { file: string; size: number; className?: string }) {
  const glyph = sourceGlyph(file);
  return <Icon icon={glyph.icon} size={size} className={cn(glyph.className, className)} />;
}
