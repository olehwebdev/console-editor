import { useState } from 'react';
import type { CaptureArea, Shot } from '@common/types';
import { api } from '@/shared/api';
import { Popover } from '@/shared/ui/popover';
import { Tooltip } from '@/shared/ui/tooltip';
import { useShotStore } from '@/entities/shot';
import { captureEverywhere, captureShot, pickToCapture } from '@/features/shot/capture';
import { openGroup } from '@/features/shot/compare';
import { addDesignFiles, importDesigns } from '@/features/shot/import-design';
import { openShot } from '@/features/shot/open-shot';
import { ShotStack } from './ShotStack';
import { ShotsMenu } from './ShotsMenu';

export interface ShotsMenuButtonProps {
  hasPage: boolean;
  /** In the editor (not the website's own window): shots open as its tabs, and elements can be picked. */
  inEditor: boolean;
}

/** At the toolbar's end: the latest captures and designs, stacked, opening the menu that takes and lists them. */
export function ShotsMenuButton({ hasPage, inEditor }: ShotsMenuButtonProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const shots = useShotStore((s) => s.shots);
  // In the website's own window a shot opens in the editor, which comes forward.
  const show = (shot: Shot) => (inEditor ? openShot(shot) : void api.showShot(shot.id));
  const capture = (area: CaptureArea) => {
    // The menu closes first: the page shows as a still under it, and a capture needs the page itself.
    setOpen(false);
    if (area === 'element') void pickToCapture();
    else void captureShot(area, null, show);
  };
  const captureGroup = () => {
    setOpen(false);
    // In the website's own window, the app's capture opens in the editor; its page leads to the group.
    void captureEverywhere(({ shots: [first] }) => (inEditor ? openGroup(first) : show(first)));
  };
  return (
    <>
      <Tooltip content="Captures and designs" describeTrigger={false}>
        <button
          type="button"
          aria-label="Captures and designs"
          aria-expanded={open}
          data-testid="shots-menu-button"
          onClick={(event) => {
            setAnchor(event.currentTarget);
            setOpen(!open);
          }}
          className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-0.5 text-fg-muted outline-none transition-colors duration-150 hover:bg-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <ShotStack shots={shots} />
        </button>
      </Tooltip>
      <Popover open={open} onOpenChange={setOpen} anchor={anchor} side="bottom" label="Captures and designs" className="w-[400px] max-w-[calc(100vw-32px)]">
        <ShotsMenu
          hasPage={hasPage}
          inEditor={inEditor}
          onCapture={capture}
          onCaptureEverywhere={captureGroup}
          onOpen={(shot) => {
            setOpen(false);
            show(shot);
          }}
          onImport={(files) => void (files ? addDesignFiles(files, show) : importDesigns(show))}
        />
      </Popover>
    </>
  );
}
