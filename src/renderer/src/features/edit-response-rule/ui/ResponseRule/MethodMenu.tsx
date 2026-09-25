import { ANY_METHOD } from '@common/overrides';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import { METHOD_CHOICES } from '../../model';

/** The method a response override answers: one, or any. A request's own unusual method (HEAD…) is offered too. */
export function MethodMenu({ value, onChange }: { value: string; onChange(method: string): void }) {
  const choices = METHOD_CHOICES.includes(value) ? METHOD_CHOICES : [...METHOD_CHOICES, value];
  const label = (method: string) => (method === ANY_METHOD ? 'Any' : method);
  return (
    <Menu
      label="Method"
      items={choices.map((method) => ({
        label: method === ANY_METHOD ? 'Any method' : method,
        checked: method === value,
        onSelect: () => onChange(method),
      }))}
    >
      <Button size="sm" variant="secondary" trailing={<Icon icon={icons.ChevronDownIcon} size={BUTTON_ICON_SIZE.sm} />} data-testid="response-method" className="w-[76px] justify-between">
        <span className="font-mono">{label(value)}</span>
      </Button>
    </Menu>
  );
}
