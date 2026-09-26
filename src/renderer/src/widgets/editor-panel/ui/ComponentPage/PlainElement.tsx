import type { InspectedComponent } from '@common/types';
import { elementLabel } from '@/entities/inspector';
import { ListenerSection } from './ListenerSection';

/** An element no framework the inspector reads rendered (plain JavaScript, or a library it doesn't know): its own listeners. */
export function PlainElement({ component }: { component: InspectedComponent }) {
  return (
    <>
      <p className="text-[13px] text-fg-muted" data-testid="component-no-framework">
        No React, Vue, Angular or web component rendered {elementLabel(component.element)}.
        {component.listeners.length ? ' Its listeners are what runs when it is used:' : ' It has no listeners of its own either.'}
      </p>
      <ListenerSection listeners={component.listeners} title="Listeners" />
    </>
  );
}
