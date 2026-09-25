import { FAIL_REASONS, type FailReason } from '@common/types';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import { FAIL_REASON_LABELS } from './constants';

/** Fail: picks the network error the page sees instead of a response. */
export function FailMenu({ onFail }: { onFail(reason: FailReason): void }) {
  return (
    <Menu label="Fail with" align="end" items={FAIL_REASONS.map((reason) => ({ label: FAIL_REASON_LABELS[reason], onSelect: () => onFail(reason) }))}>
      <Button
        size="sm"
        variant="secondary"
        leading={<Icon icon={icons.FailIcon} size={BUTTON_ICON_SIZE.sm} />}
        trailing={<Icon icon={icons.ChevronDownIcon} size={BUTTON_ICON_SIZE.sm} />}
        title="Fail it as a network error would"
        data-testid="held-fail"
      >
        Fail
      </Button>
    </Menu>
  );
}
