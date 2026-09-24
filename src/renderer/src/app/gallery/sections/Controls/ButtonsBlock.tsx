import { useState } from 'react';
import { icons } from '@/shared/config';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Kbd } from '@/shared/ui/kbd';
import { Switch } from '@/shared/ui/switch';
import { Block } from '../../Block';
import { SHORTCUT, SLOT_ICON_SIZE } from './constants';
import { Row } from './Row';
import { SaveDemo } from './SaveDemo';

const { DeleteIcon, DiffIcon, PrettifyIcon, ReloadIcon } = icons;

export function ButtonsBlock() {
  const [loading, setLoading] = useState(false);
  return (
    <Block title="Button" hint="primary · secondary · ghost · danger, sm / md, slots, loading, Swap">
      <Row label="md">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Delete</Button>
        <Button disabled>Disabled</Button>
      </Row>
      <Row label="sm">
        <Button size="sm" variant="primary">
          Primary
        </Button>
        <Button size="sm">Secondary</Button>
        <Button size="sm" variant="ghost">
          Ghost
        </Button>
        <Button size="sm" variant="danger">
          Delete
        </Button>
      </Row>
      <Row label="slots">
        <Button leading={<Icon icon={PrettifyIcon} size={SLOT_ICON_SIZE.md} />}>Pretty-print</Button>
        <Button leading={<Icon icon={DiffIcon} size={SLOT_ICON_SIZE.md} />} trailing={<Kbd keys={SHORTCUT.compare} />}>
          Compare
        </Button>
        <Button variant="ghost" trailing={<Badge tone="live">3</Badge>}>
          Overrides
        </Button>
        <Button variant="danger" leading={<Icon icon={DeleteIcon} size={SLOT_ICON_SIZE.md} />}>
          Delete override
        </Button>
      </Row>
      <Row label="loading">
        <Button loading={loading} leading={<Icon icon={ReloadIcon} size={SLOT_ICON_SIZE.md} />} onClick={() => setLoading(true)}>
          Reload page
        </Button>
        <Button variant="primary" loading={loading} onClick={() => setLoading(true)}>
          Apply
        </Button>
        <Button size="sm" loading={loading}>
          No leading
        </Button>
        <Switch size="sm" checked={loading} onCheckedChange={setLoading} label="loading" />
      </Row>
      <Row label="swap">
        <SaveDemo />
      </Row>
    </Block>
  );
}
