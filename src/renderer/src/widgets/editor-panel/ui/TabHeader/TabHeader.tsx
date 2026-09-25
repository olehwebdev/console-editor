import type { TabMeta } from '@/entities/editor-tab';
import { FileHeader } from '../FileHeader';
import { HeldHeader } from '../HeldHeader';

/** The header over a file tab: a held request's actions and fields, or a file's (and its override's). */
export function TabHeader({ tab }: { tab: TabMeta }) {
  return tab.held ? <HeldHeader tab={tab} heldId={tab.held} /> : <FileHeader tab={tab} />;
}
