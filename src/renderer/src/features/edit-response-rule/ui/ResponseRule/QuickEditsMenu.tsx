import { icons } from '@/shared/config';
import { emptyArrays, lengthenStrings } from '@/shared/lib';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import { editJsonText, nullAtCursor, QUICK_ANSWERS, type ResponseRuleForm } from '../../model';

export interface QuickEditsMenuProps {
  tabId: string;
  /** Sets fields of the response row (a status, a delay). */
  onAnswer(change: Partial<ResponseRuleForm>): void;
}

/**
 * One-click UI states: an empty list, very long texts, a missing value, a server error, a slow answer.
 * Edits to the text are one undoable edit that leaves the rest as typed; the answer's go in the row.
 */
export function QuickEditsMenu({ tabId, onAnswer }: QuickEditsMenuProps) {
  return (
    <Menu
      label="Quick edits"
      items={[
        { label: 'Empty every list', onSelect: () => editJsonText(tabId, emptyArrays) },
        { label: 'Lengthen every text', onSelect: () => editJsonText(tabId, lengthenStrings) },
        { label: 'Null the value at the cursor', onSelect: () => nullAtCursor(tabId) },
        { separator: true },
        ...QUICK_ANSWERS.map(({ label, change }) => ({ label, onSelect: () => onAnswer(change) })),
      ]}
    >
      <Button size="sm" variant="ghost" leading={<Icon icon={icons.SparklesIcon} size={BUTTON_ICON_SIZE.sm} />} trailing={<Icon icon={icons.ChevronDownIcon} size={BUTTON_ICON_SIZE.sm} />} data-testid="response-quick-edits">
        Quick edits
      </Button>
    </Menu>
  );
}
