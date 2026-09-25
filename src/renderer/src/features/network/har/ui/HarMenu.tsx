import { icons } from '@/shared/config';
import { IconButton } from '@/shared/ui/icon-button';
import { Menu } from '@/shared/ui/menu';
import { exportHar } from '../model/exportHar';
import { importHar } from '../model/importHar';

/** HAR files: the requests the list shows saved as one, or one's responses made into overrides (a teammate's bug, reproduced). */
export function HarMenu({ shownIds }: { shownIds: readonly string[] }) {
  return (
    <Menu
      label="HAR files"
      align="end"
      items={[
        { label: `Export ${shownIds.length === 1 ? 'the request' : `these ${shownIds.length} requests`} as HAR…`, icon: icons.ExportIcon, disabled: !shownIds.length, onSelect: () => void exportHar(shownIds) },
        { label: 'Import a HAR as overrides…', icon: icons.ImportIcon, onSelect: () => void importHar() },
      ]}
    >
      <IconButton icon={icons.ExportIcon} label="HAR files" size="sm" data-testid="network-har" />
    </Menu>
  );
}
