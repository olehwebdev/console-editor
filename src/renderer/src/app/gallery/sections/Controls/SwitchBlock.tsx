import { useState } from 'react';
import { Switch } from '@/shared/ui/switch';
import { Block } from '../../Block';
import { Row } from './Row';

export function SwitchBlock() {
  const [overrideActive, setOverrideActive] = useState(true);
  const [formatOnSave, setFormatOnSave] = useState(false);
  const [small, setSmall] = useState(true);
  return (
    <Block title="Switch" hint="weighted thumb (press and hold to see it stretch)">
      <Row>
        <Switch checked={overrideActive} onCheckedChange={setOverrideActive} tone="live" label="Override active" />
        <Switch checked={formatOnSave} onCheckedChange={setFormatOnSave} label="Format on save" />
        <Switch checked={small} onCheckedChange={setSmall} size="sm" label="Small" />
        <Switch checked={false} onCheckedChange={() => {}} disabled label="Disabled" />
        <Switch checked onCheckedChange={() => {}} disabled tone="live" aria-label="Disabled on" />
      </Row>
    </Block>
  );
}
