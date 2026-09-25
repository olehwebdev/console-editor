import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import { togglePicking } from '@/features/inspect/pick';
import { recordRenders } from '@/features/inspect/renders';
import { openPageStack } from '@/features/inspect/stack';

/** The inspector's commands: picking an element, the page stack, and recording renders (which shows the Renders log). */
export function inspectItems(recording: boolean, onShowRenders: () => void): CommandItem[] {
  return [
    { id: 'pick', label: 'Pick an element in the page', icon: icons.PickIcon, shortcut: SHORTCUT.pickElement, keywords: ['inspect', 'component', 'react', 'vue', 'element'], onSelect: () => void togglePicking() },
    { id: 'page-stack', label: 'Show the page stack', icon: icons.StackIcon, keywords: ['framework', 'library', 'react', 'vue', 'angular', 'frames'], onSelect: openPageStack },
    {
      id: 'renders',
      label: recording ? 'Stop recording renders' : 'Record renders: why React components rendered',
      icon: icons.RendersIcon,
      keywords: ['react', 'render', 'commit', 'profiler', 'why', 'state', 'props'],
      onSelect: () => {
        void recordRenders(!recording);
        onShowRenders();
      },
    },
  ];
}
