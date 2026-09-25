import type { InspectedState, InspectedValue } from '@common/types';
import { Badge } from '@/shared/ui/badge';
import { CodeLink } from './CodeLink';
import { HOOK_PLACE, STATE_KIND_LABEL } from './constants';

export interface ValueSectionProps {
  title: string;
  values: Array<InspectedValue | InspectedState>;
  /** Said when there are none. */
  empty: string;
  testId: string;
}

/** A component's props or state: each name, its value as the page previewed it, and where a function is defined. */
export function ValueSection({ title, values, empty, testId }: ValueSectionProps) {
  return (
    <section className="flex flex-col gap-1.5" data-testid={testId}>
      <h2 className="label-caps">{title}</h2>
      {values.length ? (
        <div className="flex flex-col rounded-xl border border-line bg-surface py-1">
          {values.map((value, index) => (
            <div key={`${value.name}:${index}`} className="flex min-w-0 items-baseline gap-3 px-3.5 py-1 text-[12.5px]" data-testid="component-value">
              <span className="w-32 shrink-0 truncate font-mono text-fg-muted">{HOOK_PLACE.test(value.name) ? `#${value.name}` : value.name}</span>
              {'kind' in value ? <Badge>{STATE_KIND_LABEL[value.kind]}</Badge> : null}
              <span className="min-w-0 flex-1 truncate font-mono text-fg">{value.preview}</span>
              <CodeLink location={value.location} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-fg-subtle">{empty}</p>
      )}
    </section>
  );
}
