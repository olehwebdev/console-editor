import type { KeyboardEvent } from 'react';
import { KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { Counter } from '@/shared/ui/counter';
import type { PaneTabsProps } from './types';

/** How far each key moves along the tabs (they wrap around). */
const STEP: Readonly<Record<string, number>> = { [KEY.arrowRight]: 1, [KEY.arrowLeft]: -1 };

const TAB = 'relative inline-flex h-full items-center px-1.5 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50';

/**
 * The views of a pane as a strip of words: the one shown in the foreground with an ember underline.
 * One tab stop; arrows move between the tabs and show each (WAI-ARIA tabs, automatic activation).
 * `caps` sets them as the pane's heading (the `label-caps` style). A tab's count shows what waits in it,
 * and a dot what runs in it.
 */
export function PaneTabs<T extends string>({ tabs, value, onChange, label, caps = false, className }: PaneTabsProps<T>) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!Object.hasOwn(STEP, event.key)) return;
    event.preventDefault();
    const at = tabs.findIndex((tab) => tab.id === value);
    const next = tabs[(at + STEP[event.key]! + tabs.length) % tabs.length]!;
    onChange(next.id);
    event.currentTarget.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus();
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn('flex h-full items-stretch gap-1', className)}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            data-tab={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(TAB, caps ? 'label-caps' : 'text-[12px] font-medium', selected ? 'text-fg' : 'text-fg-subtle hover:text-fg-muted')}
          >
            {tab.label}
            {tab.count ? <Counter value={tab.count} className="ml-1 rounded-full bg-warning/15 px-1 font-sans text-[10.5px] normal-case tracking-normal text-warning" /> : null}
            {tab.live ? <span aria-hidden className="ml-1 size-1.5 rounded-full bg-danger" /> : null}
            {selected ? <span aria-hidden className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-accent" /> : null}
          </button>
        );
      })}
    </div>
  );
}
