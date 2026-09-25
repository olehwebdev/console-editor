import { MATCH_TYPES } from '@common/types';
import { icons, KEY } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { Menu } from '@/shared/ui/menu';
import { Switch } from '@/shared/ui/switch';
import { DEFAULT_TEST_ID_PREFIX, TYPE_HELP } from './constants';
import type { UrlMatcherFieldsProps } from './types';

/**
 * Which request URLs something applies to: the match type, the pattern and "ignore ?query".
 * Controlled; renders its three controls as siblings, so the caller lays them out (a wrapping row).
 */
export function UrlMatcherFields({ value, onChange, onEnter, testIdPrefix = DEFAULT_TEST_ID_PREFIX, autoFocus }: UrlMatcherFieldsProps) {
  const { type, pattern, ignoreQuery } = value;
  return (
    <>
      <Menu
        label="Match type"
        items={MATCH_TYPES.map((t) => ({ label: `${t} — ${TYPE_HELP[t]}`, checked: t === type, onSelect: () => onChange({ ...value, type: t }) }))}
      >
        <Button size="sm" variant="secondary" trailing={<Icon icon={icons.ChevronDownIcon} size={BUTTON_ICON_SIZE.sm} />} data-testid={`${testIdPrefix}-type`}>
          <span className="font-mono">{type}</span>
        </Button>
      </Menu>
      <Input
        size="sm"
        mono
        value={pattern}
        autoFocus={autoFocus}
        onChange={(e) => onChange({ ...value, pattern: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === KEY.enter && !e.nativeEvent.isComposing) onEnter?.();
        }}
        aria-label="URL pattern"
        data-testid={`${testIdPrefix}-pattern`}
        className="min-w-[220px] flex-1"
      />
      <Switch
        size="sm"
        checked={ignoreQuery}
        onCheckedChange={(checked) => onChange({ ...value, ignoreQuery: checked })}
        label={<span className="text-[12px] text-fg-muted">ignore ?query</span>}
      />
    </>
  );
}
