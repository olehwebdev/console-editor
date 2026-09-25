import { SHORTCUT } from '@common/constants';
import { Kbd } from '@/shared/ui/kbd';

/** Nothing picked yet: what picking does. */
export function PickHint() {
  return (
    <p className="mx-4 text-[12.5px] leading-relaxed text-fg-muted">
      Pick an element (<Kbd keys={SHORTCUT.pickElement} />) to see the React or Vue component that rendered it, where it is defined, and what it holds.
    </p>
  );
}
