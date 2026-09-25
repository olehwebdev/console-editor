import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { useHeldStore } from '@/entities/held-request';
import { requestPath } from '@/entities/network-request';
import { showHeld } from '@/features/network/held';
import { HELD_STAGE_NOTES } from './constants';

/** Above the list while breakpoints hold requests: each one, oldest first, which brings its tab to the front. */
export function HeldStrip() {
  const held = useHeldStore((s) => s.held);
  if (!held.length) return null;
  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-warning/25 bg-warning/8 px-2 py-1" role="group" aria-label="Paused requests" data-testid="network-held">
      <Icon icon={icons.PauseIcon} size={12} className="shrink-0 text-warning" />
      <span className="shrink-0 text-[12px] text-warning">{held.length} paused</span>
      {held.map((h) => (
        <button
          key={h.id}
          type="button"
          title={`${h.method} ${h.url}\nPaused ${HELD_STAGE_NOTES[h.stage]}: open it`}
          onClick={() => showHeld(h.id)}
          data-testid="network-held-request"
          className="flex h-5 shrink-0 items-center gap-1.5 rounded-md border border-warning/25 bg-surface-editor px-1.5 font-mono text-[11.5px] outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <span className="text-fg-muted">{h.method}</span>
          <span className="max-w-[240px] truncate">{requestPath(h.url)}</span>
          <span className="font-sans text-[10.5px] text-fg-subtle">{HELD_STAGE_NOTES[h.stage]}</span>
        </button>
      ))}
    </div>
  );
}
