import { Add01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Counter } from '@/shared/ui/counter';
import { IconButton } from '@/shared/ui/icon-button';
import { Block } from '../../Block';
import { Row } from './Row';

const COUNTER_START = 7;
/** "Random" picks a whole number below this. */
const COUNTER_RANDOM_MAX = 120;
/** Digits the "requests" readout is zero-padded to (007). */
const REQUESTS_PAD = 3;

export function CounterBlock() {
  const [count, setCount] = useState(COUNTER_START);
  return (
    <Block title="Counter" hint="only changed digits roll, in the direction of the change">
      <Row>
        <IconButton icon={MinusSignIcon} label="Decrement" onClick={() => setCount((c) => c - 1)} />
        <span className="w-16 text-center font-mono text-lg">
          <Counter value={count} />
        </span>
        <IconButton icon={Add01Icon} label="Increment" onClick={() => setCount((c) => c + 1)} />
        <Button size="sm" variant="ghost" onClick={() => setCount(Math.floor(Math.random() * COUNTER_RANDOM_MAX))}>
          Random
        </Button>
        <Badge tone="live" dot>
          <Counter value={count} /> live
        </Badge>
        <span className="text-[13px] text-fg-muted">
          <Counter value={count} pad={REQUESTS_PAD} /> requests
        </span>
      </Row>
    </Block>
  );
}
