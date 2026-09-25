import { RULE_RESOURCE_TYPES } from '@common/types';
import { Button } from '@/shared/ui/button';
import { RESOURCE_TYPE_LABELS } from '@/entities/rule';
import type { ResourceTypePickerProps } from './types';

/** A pressed toggle's look. */
const PRESSED = 'aria-pressed:border-accent/40 aria-pressed:bg-accent/12 aria-pressed:text-accent';

/** Which request types a rule applies to: all of them, or the ones pressed. */
export function ResourceTypePicker({ value, onChange }: ResourceTypePickerProps) {
  return (
    <div role="group" aria-label="Request types" className="flex flex-wrap gap-1">
      <Button size="sm" variant="secondary" aria-pressed={value.length === 0} className={PRESSED} onClick={() => onChange([])}>
        All types
      </Button>
      {RULE_RESOURCE_TYPES.map((type) => {
        const on = value.includes(type);
        // Kept in the list's order; every type pressed is the same as all of them.
        const next = RULE_RESOURCE_TYPES.filter((t) => (t === type ? !on : value.includes(t)));
        return (
          <Button
            key={type}
            size="sm"
            variant="secondary"
            aria-pressed={on}
            className={PRESSED}
            onClick={() => onChange(next.length === RULE_RESOURCE_TYPES.length ? [] : next)}
            data-testid={`rule-type-${type}`}
          >
            {RESOURCE_TYPE_LABELS[type]}
          </Button>
        );
      })}
    </div>
  );
}
