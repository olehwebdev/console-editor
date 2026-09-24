import { useState } from 'react';
import type { ConsoleFrame } from '@common/types';
import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Popover } from '@/shared/ui/popover';
import { frameKey, frameLabel, givenName } from '@/entities/frame';
import { FrameNameForm } from '@/features/name-frame';

export interface NameFrameButtonProps {
  /** The frame to name; the button is disabled without one. */
  frame: ConsoleFrame | null;
  names: Readonly<Record<string, string>>;
}

/** Opens a small form beside the button to name the picked frame for this workspace. */
export function NameFrameButton({ frame, names }: NameFrameButtonProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const key = frame ? frameKey(frame) : '';
  return (
    <>
      <IconButton
        icon={icons.NameIcon}
        label="Name this frame"
        size="sm"
        disabled={!frame}
        data-testid="console-name-frame"
        className="mt-1"
        onClick={(event) => {
          setAnchor(event.currentTarget);
          setOpen(!open);
        }}
      />
      <Popover open={open && !!frame} onOpenChange={setOpen} anchor={anchor} side="bottom" label="Frame name">
        {frame ? (
          <FrameNameForm
            key={key}
            frameKey={key}
            name={givenName(names, key)}
            automatic={frameLabel(frame, {})}
            address={frame.url}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </Popover>
    </>
  );
}
