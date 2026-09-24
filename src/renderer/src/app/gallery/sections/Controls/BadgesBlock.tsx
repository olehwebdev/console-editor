import { icons } from '@/shared/config';
import { Badge } from '@/shared/ui/badge';
import { Counter } from '@/shared/ui/counter';
import { Block } from '../../Block';
import { Row } from './Row';

const { IframeIcon, LiveIcon, WorkerIcon } = icons;

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
      <Row label="loaded by">
        <Badge tone="info" icon={IframeIcon}>
          iframe
        </Badge>
        <Badge tone="info" icon={WorkerIcon}>
          worker
        </Badge>
        <Badge tone="info" icon={WorkerIcon}>
          shared worker
        </Badge>
        <Badge tone="info" icon={WorkerIcon}>
          service worker
        </Badge>
        <Badge tone="info" icon={WorkerIcon}>
          worklet
        </Badge>
      </Row>
    </Block>
  );
}
