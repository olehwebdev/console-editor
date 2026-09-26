import type { Dispatch, SetStateAction } from 'react';
import { icons } from '@/shared/config';
import { confirm } from '@/shared/ui/dialog';
import type { MenuItem } from '@/shared/ui/menu';
import { SHORTCUT } from './constants';
import { say } from './say';

const { CopyIcon, DeleteIcon, DiffIcon, ExternalLinkIcon, PrettifyIcon, SaveIcon } = icons;

export interface FileMenuState {
  wordWrap: boolean;
  setWordWrap: Dispatch<SetStateAction<boolean>>;
  /** Shows how the delete confirmation was answered. */
  setAnswer: (answer: string) => void;
}

/** The editor's file actions: shortcuts, a checkbox item, a disabled one and a danger one that confirms. */
export function fileMenu({ wordWrap, setWordWrap, setAnswer }: FileMenuState): MenuItem[] {
  return [
    { label: 'Save override', icon: SaveIcon, shortcut: SHORTCUT.save, onSelect: () => say('Saved') },
    { label: 'Format document', icon: PrettifyIcon, shortcut: SHORTCUT.format, onSelect: () => say('Formatted') },
    { label: 'Compare with original', icon: DiffIcon, onSelect: () => say('Diff opened') },
    { label: 'Word wrap', checked: wordWrap, onSelect: () => setWordWrap((w) => !w) },
    { separator: true },
    { label: 'Copy URL', icon: CopyIcon, shortcut: SHORTCUT.copyUrl, onSelect: () => say('URL copied') },
    { label: 'Open in browser', icon: ExternalLinkIcon, disabled: true, onSelect: () => undefined },
    { separator: true },
    {
      label: 'Delete override',
      icon: DeleteIcon,
      danger: true,
      onSelect: () =>
        void confirm({
          title: 'Delete override?',
          body: 'main.js will be served from the network again. This cannot be undone.',
          confirmLabel: 'Delete',
          tone: 'danger',
        }).then((ok) => setAnswer(ok ? 'Deleted' : 'Kept')),
    },
  ];
}
