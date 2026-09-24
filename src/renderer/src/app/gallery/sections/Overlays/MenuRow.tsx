import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { Menu, type MenuItem } from '@/shared/ui/menu';
import { DemoButton } from './DemoButton';
import { Row } from './Row';
import { rowMenu } from './rowMenu';

/** Dropdown menus: the file actions, and a row's actions aligned to the end and opening upwards. */
export function MenuRow({ fileMenu }: { fileMenu: MenuItem[] }) {
  const resourceMenu = rowMenu();
  return (
    <Row title="Menu" note="Click, or focus + Enter / ↓ (↑ opens on the last item). Arrows, typeahead, Esc.">
      <Menu items={fileMenu} label="File actions">
        <DemoButton>
          File actions <Icon icon={icons.ChevronDownIcon} size={14} className="text-fg-muted" />
        </DemoButton>
      </Menu>
      <Menu items={resourceMenu} align="end" label="Resource actions">
        <DemoButton>Aligned end</DemoButton>
      </Menu>
      <Menu items={resourceMenu} side="top" label="Resource actions">
        <DemoButton>Opens up</DemoButton>
      </Menu>
    </Row>
  );
}
