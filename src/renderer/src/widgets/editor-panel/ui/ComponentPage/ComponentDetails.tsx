import type { InspectedComponent } from '@common/types';
import { ChainSection } from './ChainSection';
import { ContextSection } from './ContextSection';
import { NO_STATE } from './constants';
import { HandlerSection } from './HandlerSection';
import { SourceCard } from './SourceCard';
import { ValueSection } from './ValueSection';

/** What a framework's component holds: where it is defined, props, state, context, the element's handlers, and what rendered it. */
export function ComponentDetails({ component }: { component: InspectedComponent & { framework: NonNullable<InspectedComponent['framework']> } }) {
  return (
    <>
      <SourceCard component={component} />
      <ValueSection title="Props" values={component.props} empty="No props." testId="component-props" />
      <ValueSection title="State" values={component.state} empty={NO_STATE[component.framework]} testId="component-state" />
      <ContextSection component={component} />
      <HandlerSection component={component} />
      <ChainSection component={component} />
    </>
  );
}
