import { useMemo } from 'react';
import { CommandPalette } from '@/shared/ui/command-palette';
import { Kbd } from '@/shared/ui/kbd';
import { commandGroups } from './commandGroups';
import { SHORTCUT } from './constants';
import { DemoButton } from './DemoButton';
import { Row } from './Row';

/** The command palette over the demo commands and 2 000 resources. */
export function PaletteRow({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const groups = useMemo(() => commandGroups(), []);
  return (
    <Row title="Command palette" note="Fuzzy filter, 2 000 virtualized resources.">
      <DemoButton onClick={() => onOpenChange(true)}>
        Open palette <Kbd keys={SHORTCUT.palette} />
      </DemoButton>
      <CommandPalette open={open} onOpenChange={onOpenChange} groups={groups} placeholder="Search commands and resources…" />
    </Row>
  );
}
