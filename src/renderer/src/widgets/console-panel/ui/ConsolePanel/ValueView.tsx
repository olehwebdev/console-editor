import { useState } from 'react';
import type { ConsoleProperty, ConsoleValue } from '@common/types';
import { errorMessage } from '@/shared/api';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Icon } from '@/shared/ui/icon';
import { loadProperties } from '@/features/expand-console-value';
import { VALUE_TONE } from './constants';
import { PropertyList } from './PropertyList';

/** Properties of an expanded value: loaded, still loading, or failed. */
type Expansion = { properties: ConsoleProperty[] } | { error: string } | null;

/** A logged value; an object opens to list its properties, read from the page when first opened. */
export function ValueView({ value }: { value: ConsoleValue }) {
  const [open, setOpen] = useState(false);
  const [expansion, setExpansion] = useState<Expansion>(null);
  const text = <span className={cn('whitespace-pre-wrap break-words', VALUE_TONE[value.kind])}>{value.text}</span>;
  const { handle } = value;
  if (handle === undefined) return text;

  const toggle = () => {
    setOpen(!open);
    if (open || expansion) return;
    loadProperties(handle).then(
      (properties) => setExpansion({ properties }),
      (err: unknown) => setExpansion({ error: errorMessage(err) }),
    );
  };

  return (
    <span className="inline-flex min-w-0 flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex min-w-0 items-start gap-0.5 rounded-sm text-left outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <Icon icon={icons.ChevronRightIcon} size={12} className={cn('mt-[3px] shrink-0 text-fg-subtle transition-transform duration-150', open && 'rotate-90')} />
        {text}
      </button>
      {open ? <PropertyList expansion={expansion} /> : null}
    </span>
  );
}
