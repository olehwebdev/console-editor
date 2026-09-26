import { SHORTCUT } from '@common/constants';
import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import { togglePicking } from '@/features/inspect/pick';
import { recordRenders } from '@/features/inspect/renders';
import { openPageStack } from '@/features/inspect/stack';
import { recordStores } from '@/features/inspect/stores';

/** The logs of what the framework hooks hear: React's commits, and the stores' actions. */
export type InspectLog = 'renders' | 'stores';

/** The inspector's commands: picking an element, the page stack, and recording renders or store actions (which shows its log). */
export function inspectItems(recording: Record<InspectLog, boolean>, onShowLog: (log: InspectLog) => void): CommandItem[] {
  return [
    { id: 'pick', label: 'Pick an element in the page', icon: icons.PickIcon, shortcut: SHORTCUT.pickElement, keywords: ['inspect', 'component', 'react', 'vue', 'element'], onSelect: () => void togglePicking() },
    { id: 'page-stack', label: 'Show the page stack', icon: icons.StackIcon, keywords: ['framework', 'library', 'react', 'vue', 'angular', 'frames'], onSelect: openPageStack },
    {
      id: 'renders',
      label: recording.renders ? 'Stop recording renders' : 'Record renders: why React components rendered',
      icon: icons.RendersIcon,
      keywords: ['react', 'render', 'commit', 'profiler', 'why', 'state', 'props'],
      onSelect: () => {
        void recordRenders(!recording.renders);
        onShowLog('renders');
      },
    },
    {
      id: 'stores',
      label: recording.stores ? 'Stop recording store actions' : "Record store actions: what the page's stores did",
      icon: icons.StoresIcon,
      keywords: ['redux', 'ngrx', 'zustand', 'pinia', 'vuex', 'store', 'action', 'dispatch', 'state'],
      onSelect: () => {
        void recordStores(!recording.stores);
        onShowLog('stores');
      },
    },
  ];
}
