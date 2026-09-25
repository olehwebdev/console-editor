import { useEffect } from 'react';
import { SHORTCUT } from '@common/constants';
import { icons, KEY } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { useInspectorStore } from '@/entities/inspector';
import { stopPicking, togglePicking } from '@/features/inspect/pick';

/** Picking an element in the page, on while it picks. */
export function PickButton({ disabled }: { disabled: boolean }) {
  const picking = useInspectorStore((s) => s.picking);

  // Esc in the editor stops picking too (in the page, Chromium's inspect mode takes Esc itself).
  useEffect(() => {
    if (!picking) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === KEY.escape) void stopPicking();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picking]);

  return (
    <IconButton
      icon={icons.PickIcon}
      label={picking ? 'Stop picking' : 'Pick an element in the page'}
      shortcut={SHORTCUT.pickElement}
      size="sm"
      active={picking}
      disabled={disabled && !picking}
      onClick={() => void togglePicking()}
      data-testid="pick-element"
    />
  );
}
