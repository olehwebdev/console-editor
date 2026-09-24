import { Button } from '@/shared/ui/button';
import { Tooltip, type TooltipSide } from '@/shared/ui/tooltip';
import { Block } from '../../Block';
import { SHORTCUT } from './constants';
import { NativeViewDemo } from './NativeViewDemo';
import { Row } from './Row';

/** Render order of the side demos, clockwise from the top. */
const TOOLTIP_SIDES = ['top', 'right', 'bottom', 'left'] as const satisfies readonly TooltipSide[];

export function TooltipBlock() {
  return (
    <Block title="Tooltip" hint="sides, shortcut, flip at the window edge and off the native page view, pinned for review">
      <Row>
        {TOOLTIP_SIDES.map((side) => (
          <Tooltip key={side} content={`Tooltip on ${side}`} side={side}>
            <Button size="sm">{side}</Button>
          </Tooltip>
        ))}
        <Tooltip content="Save override" shortcut={SHORTCUT.save}>
          <Button size="sm" variant="ghost">
            with shortcut
          </Button>
        </Tooltip>
        <Tooltip content="A longer description wraps at 320 px so it never runs across the whole window width.">
          <Button size="sm" variant="ghost">
            long text
          </Button>
        </Tooltip>
      </Row>
      <Row>
        <div className="h-8" />
        <Tooltip content="Pinned open" shortcut={SHORTCUT.palette} side="right" open>
          <span className="text-xs text-fg-muted">Pinned →</span>
        </Tooltip>
      </Row>
      <Row label="page view">
        <NativeViewDemo />
      </Row>
    </Block>
  );
}
