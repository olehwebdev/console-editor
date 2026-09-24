import type { ResourceKind } from '@common/types';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';

const GLYPH = { Script: icons.JsIcon, Stylesheet: icons.CssIcon, Document: icons.HtmlIcon } as const;
const TINT = { Script: 'text-kind-js', Stylesheet: 'text-kind-css', Document: 'text-kind-html' } as const;
/** A file kind's glyph beside a file name, a pixel under the control size. */
const DEFAULT_SIZE = 15;

/** Tinted glyph for a file kind (JS yellow, CSS blue, HTML orange). */
export function KindIcon({ kind, size = DEFAULT_SIZE, className }: { kind: ResourceKind; size?: number; className?: string }) {
  return <Icon icon={GLYPH[kind]} size={size} className={cn(TINT[kind], className)} />;
}
