import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';

export interface ChoiceMenuProps<T extends string> {
  label: string;
  value: T;
  choices: readonly T[];
  /** How a choice reads. */
  text(choice: T): string;
  onChange(choice: T): void;
  testId: string;
}

/** A button showing a choice, which opens a menu of the others. */
export function ChoiceMenu<T extends string>({ label, value, choices, text, onChange, testId }: ChoiceMenuProps<T>) {
  return (
    <Menu label={label} items={choices.map((choice) => ({ label: text(choice), checked: choice === value, onSelect: () => onChange(choice) }))}>
      <Button size="sm" variant="secondary" trailing={<Icon icon={icons.ChevronDownIcon} size={BUTTON_ICON_SIZE.sm} />} aria-label={label} data-testid={testId}>
        {text(value)}
      </Button>
    </Menu>
  );
}
