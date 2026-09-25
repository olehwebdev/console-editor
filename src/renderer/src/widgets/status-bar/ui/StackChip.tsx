import { useShallow } from 'zustand/react/shallow';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { selectUiLibraries, usePageStackStore } from '@/entities/page-stack';
import { openPageStack } from '@/features/inspect/stack';
import { ITEM_ICON_SIZE } from './constants';

/** The UI libraries the page runs (Angular · React · Vue); opens the Page stack. Hidden until one is found. */
export function StackChip() {
  const libraries = usePageStackStore(useShallow(selectUiLibraries));
  if (!libraries.length) return null;
  return (
    <button
      type="button"
      onClick={openPageStack}
      title="Page stack: what each frame runs"
      className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      data-testid="status-stack"
    >
      <Icon icon={icons.StackIcon} size={ITEM_ICON_SIZE} />
      {libraries.join(' · ')}
    </button>
  );
}
