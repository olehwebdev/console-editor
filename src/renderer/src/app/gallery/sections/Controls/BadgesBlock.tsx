import { icons } from '@/shared/config';
import { Badge } from '@/shared/ui/badge';
import { Counter } from '@/shared/ui/counter';
import { Block } from '../../Block';
import { Row } from './Row';

const { LiveIcon } = icons;

export function BadgesBlock() {
  return (
    <Block title="Badge" hint="tones, dot, live pulse, glyph">
      <Row label="tones">
        <Badge>neutral</Badge>
        <Badge tone="live">live</Badge>
        <Badge tone="warning">upstream changed</Badge>
        <Badge tone="info">iframe</Badge>
        <Badge tone="accent">new</Badge>
        <Badge tone="danger">error</Badge>
      </Row>
      <Row label="dot">
        <Badge dot>idle</Badge>
        <Badge tone="live" dot pulse>
          Live
        </Badge>
        <Badge tone="warning" dot>
          Stale
        </Badge>
        <Badge tone="info" icon={LiveIcon}>
          Served
        </Badge>
        <Badge tone="accent">
          <Counter value={12} />
        </Badge>
      </Row>
    </Block>
  );
}
