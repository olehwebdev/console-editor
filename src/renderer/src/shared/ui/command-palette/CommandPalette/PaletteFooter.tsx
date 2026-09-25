// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { Kbd } from '@/shared/ui/kbd';

/** The key hints under the list. */
export function PaletteFooter() {
  return (
    <div className="flex h-8 items-center gap-4 border-t border-line px-3 text-[11px] text-fg-subtle">
      <span className="inline-flex items-center gap-1.5">
        <Kbd keys={['↑', '↓']} /> Navigate
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Kbd keys={['enter']} /> Run
      </span>
      <span className="ml-auto inline-flex items-center gap-1.5">
        <Kbd keys={['Esc']} /> Close
      </span>
    </div>
  );
}
