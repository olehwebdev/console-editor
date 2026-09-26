import { useWatch } from 'react-hook-form';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { ruleNotes } from './ruleNotes';
import type { RuleActionFieldsProps } from './types';

/** What is worth knowing about the rule as written: its cost, and what it can't change. */
export function RuleNotes({ control, pageUrl }: RuleActionFieldsProps & { pageUrl: string }) {
  const notes = useWatch({ control, compute: (value) => ruleNotes(value, pageUrl) });
  if (!notes.length) return null;
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Notes">
      {notes.map((note) => (
        <li key={note.id} data-note={note.id} className="flex items-start gap-2.5 rounded-lg bg-info/[0.07] px-3 py-2 text-[12.5px] leading-relaxed text-fg-muted">
          <Icon icon={icons.InfoIcon} size={15} className="mt-0.5 text-info" />
          <span className="min-w-0 flex-1">{note.text}</span>
        </li>
      ))}
    </ul>
  );
}
