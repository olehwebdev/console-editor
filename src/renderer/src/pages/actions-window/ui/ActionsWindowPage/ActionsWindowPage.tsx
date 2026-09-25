import { ActionsPanel } from '@/widgets/actions-panel';

/** The Actions panel's own window (to keep beside the page, on top, or on another screen): the panel alone, filling it. */
export function ActionsWindowPage() {
  return (
    <div className="h-full bg-surface pt-1 text-fg">
      <ActionsPanel placement="window" />
    </div>
  );
}
