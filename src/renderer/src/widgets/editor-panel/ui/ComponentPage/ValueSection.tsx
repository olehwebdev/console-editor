import type { InspectedState, InspectedValue } from '@common/types';
import { ValueRow } from './ValueRow';

export interface ValueSectionProps {
  title: string;
  values: Array<InspectedValue | InspectedState>;
  /** Said when there are none. */
  empty: string;
  testId: string;
  /** A React component's hook names, read off its original. */
  hookNames?: ReadonlyArray<string | null>;
}

/** A component's props or state: each name, its value as the page previewed it, and where a function is defined. */
export function ValueSection({ title, values, empty, testId, hookNames }: ValueSectionProps) {
  return (
    <section className="flex flex-col gap-1.5" data-testid={testId}>
      <h2 className="label-caps">{title}</h2>
      {values.length ? (
        <div className="flex flex-col rounded-xl border border-line bg-surface py-1">
          {values.map((value, index) => (
            <ValueRow key={`${value.name}:${index}`} value={value} hookNames={hookNames} />
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-fg-subtle">{empty}</p>
      )}
    </section>
  );
}
