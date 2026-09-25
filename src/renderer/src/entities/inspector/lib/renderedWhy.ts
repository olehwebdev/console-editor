import type { RenderedComponent } from '@common/types';
import { REASON_LABEL } from './constants';
import { hookName } from './hookName';

/** Why a component took part in a commit, in words: each reason with what changed (hooks named when their names are known). */
export function renderedWhy(component: RenderedComponent, hookNames: ReadonlyArray<string | null> | undefined): string {
  if (component.kind === 'mount') return 'mounted';
  if (component.kind === 'skip') return component.memo ? 'skipped: memo, props equal' : 'skipped: same props';
  return component.reasons
    .map((reason) => {
      const changes = reason.changes.map((change) => `${reason.kind === 'state' || reason.kind === 'store' ? hookName(change.name, hookNames) : change.name} ${change.from} → ${change.to}`);
      return [REASON_LABEL[reason.kind], changes.join(', ')].filter(Boolean).join(' ');
    })
    .join('; ');
}
