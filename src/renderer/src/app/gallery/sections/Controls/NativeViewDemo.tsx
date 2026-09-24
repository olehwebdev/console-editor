import { useEffect, useRef } from 'react';
import { icons } from '@/shared/config';
import { setNativeViewRect } from '@/shared/lib';
import { IconButton } from '@/shared/ui/icon-button';
import type { TooltipSide } from '@/shared/ui/tooltip';
import { SHORTCUT } from './constants';

const { DevToolsIcon, ReloadIcon } = icons;

/** The side the toolbar asks for; the view underneath makes it flip. */
const ASKED_SIDE: TooltipSide = 'bottom';

/**
 * A stand-in for the website's native view, registered while the pointer or
 * focus is inside, so its toolbar's tooltips (asked for ASKED_SIDE) flip above.
 */
export function NativeViewDemo() {
  const view = useRef<HTMLDivElement>(null);
  const register = () => {
    const r = view.current?.getBoundingClientRect();
    setNativeViewRect(r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null);
  };
  const unregister = () => setNativeViewRect(null);
  useEffect(() => () => setNativeViewRect(null), []);
  return (
    <div
      className="flex w-72 flex-col overflow-hidden rounded-xl border border-line bg-surface"
      onPointerEnter={register}
      onPointerLeave={unregister}
      onFocusCapture={register}
      onBlurCapture={unregister}
    >
      <div className="flex h-10 items-center gap-1 border-b border-line px-2">
        <IconButton icon={ReloadIcon} label="Reload page" shortcut={SHORTCUT.reload} size="sm" tooltipSide={ASKED_SIDE} />
        <IconButton icon={DevToolsIcon} label="DevTools for the page" shortcut={SHORTCUT.pageDevTools} size="sm" tooltipSide={ASKED_SIDE} />
      </div>
      <div ref={view} className="flex h-20 items-center justify-center bg-surface-raised px-4 text-center text-xs text-fg-subtle">
        {`native page view: tooltips asked for ${ASKED_SIDE} flip above it`}
      </div>
    </div>
  );
}
