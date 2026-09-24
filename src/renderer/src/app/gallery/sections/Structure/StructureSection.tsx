import { EditorTabsBlock } from './EditorTabsBlock';
import { EmptyStateBlock } from './EmptyStateBlock';
import { FileTreeBlock } from './FileTreeBlock';
import { ResizerBlock } from './ResizerBlock';
import { SectionsBlock } from './SectionsBlock';
import { VirtualBlock } from './VirtualBlock';

/** Gallery section for the STRUCTURE group of shared/ui. */
export function StructureSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <FileTreeBlock />
        <VirtualBlock />
      </div>
      <SectionsBlock />
      <EditorTabsBlock />
      <EmptyStateBlock />
      <ResizerBlock />
    </div>
  );
}
