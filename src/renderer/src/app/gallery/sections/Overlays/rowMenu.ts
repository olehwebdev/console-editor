import { icons } from '@/shared/config';
import type { MenuItem } from '@/shared/ui/menu';
import { toast } from '@/shared/ui/toast';
import { SHORTCUT } from './constants';
import { say } from './say';

const { CopyIcon, FileIcon, LiveIcon, ReloadIcon } = icons;

/** A resource row's actions. */
export function rowMenu(): MenuItem[] {
  return [
    { label: 'Open', icon: FileIcon, shortcut: SHORTCUT.open, onSelect: () => say('Opened') },
    { label: 'Override', icon: LiveIcon, onSelect: () => toast({ title: 'Override active', tone: 'success' }) },
    { label: 'Copy URL', icon: CopyIcon, onSelect: () => say('URL copied') },
    { separator: true },
    { label: 'Reload page', icon: ReloadIcon, shortcut: SHORTCUT.reload, onSelect: () => say('Reloaded') },
  ];
}
