import { useState } from 'react';
import { ConfirmRow } from './ConfirmRow';
import { ContextMenuRow } from './ContextMenuRow';
import { fileMenu } from './fileMenu';
import { MenuRow } from './MenuRow';
import { PaletteRow } from './PaletteRow';
import { PopoverRow } from './PopoverRow';
import { ToastRow } from './ToastRow';
import { useGalleryHotkeys } from './useGalleryHotkeys';

/** Every overlay in its main states: dropdown & context menus, palette, toasts, confirm. */
export function OverlaysSection() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [answer, setAnswer] = useState<string>('—');
  useGalleryHotkeys(setPaletteOpen);

  const fileActions = fileMenu({ wordWrap, setWordWrap, setAnswer });

  return (
    <section className="max-w-4xl">
      <h2 className="label-caps mb-2">Overlays</h2>
      <MenuRow fileMenu={fileActions} />
      <ContextMenuRow fileMenu={fileActions} />
      <PopoverRow />
      <PaletteRow open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ToastRow />
      <ConfirmRow answer={answer} onAnswer={setAnswer} />
      {/* No <ToastStack/> or <ConfirmDialog/> here: App mounts the hosts (with their real placement) in every mode. */}
    </section>
  );
}
