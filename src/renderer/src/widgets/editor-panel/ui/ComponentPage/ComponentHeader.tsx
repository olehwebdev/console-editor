import { SHORTCUT } from '@common/constants';
import type { InspectedComponent } from '@common/types';
import { icons } from '@/shared/config';
import { Badge } from '@/shared/ui/badge';
import { IconButton } from '@/shared/ui/icon-button';
import { componentTitle, elementLabel, useInspectorStore } from '@/entities/inspector';
import { highlightPick, togglePicking } from '@/features/inspect/pick';
import { BUILD_TONE } from '../StackPage/constants';
import { ComponentFrame } from './ComponentFrame';
import { FRAMEWORK_NAME } from './constants';
import { readComponentAt } from './readComponentAt';

/** The component's name (its original's when the page's is minified), framework, build and frame, and the element it rendered; hovering it highlights the element. */
export function ComponentHeader({ component }: { component: InspectedComponent }) {
  const origins = useInspectorStore((s) => s.origins);
  const link = component.chain[component.depth];
  const name = componentTitle(component, origins);
  return (
    <header className="flex flex-col gap-2" onPointerEnter={() => highlightPick(component.pickId)} onPointerLeave={() => highlightPick(null)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <h1 className="min-w-0 truncate text-xl font-semibold text-fg" data-testid="component-name">
          {name}
        </h1>
        {component.framework ? <Badge tone="info">{FRAMEWORK_NAME[component.framework]}</Badge> : null}
        {component.build ? <Badge tone={BUILD_TONE[component.build]}>{component.build}</Badge> : null}
        <span className="flex-1" />
        <IconButton icon={icons.ReloadIcon} label="Read it again" size="sm" onClick={() => void readComponentAt(component.depth)} data-testid="component-reread" />
        <IconButton icon={icons.PickIcon} label="Pick another element" shortcut={SHORTCUT.pickElement} size="sm" onClick={() => void togglePicking()} />
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <ComponentFrame frameId={component.frameId} />
        <p className="min-w-0 truncate font-mono text-[12px] text-fg-muted">
          {elementLabel(component.element)}
          {link && name !== link.name ? <span className="text-fg-subtle"> · minified as {link.name}</span> : null}
        </p>
        {component.framework === 'angular' && component.build === 'production' ? (
          <span className="shrink-0" title="A production build publishes no API for its components: they were read from Angular's private view registry, which can change with any release.">
            <Badge tone="warning">read from Angular's internals</Badge>
          </span>
        ) : null}
      </div>
    </header>
  );
}
