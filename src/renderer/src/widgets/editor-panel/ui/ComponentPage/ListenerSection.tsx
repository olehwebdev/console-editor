import type { InspectedListener } from '@common/types';
import { Badge } from '@/shared/ui/badge';
import { CodeLink } from '@/features/open-resource';

/** What each of a listener's options is called, when set. */
const OPTION_LABEL: Array<[keyof Pick<InspectedListener, 'capture' | 'once' | 'passive'>, string]> = [
  ['capture', 'capture'],
  ['once', 'once'],
  ['passive', 'passive'],
];

/** Every listener on the element, as the DOM has it: the event, the function it runs (a framework's own included) and where it is. */
export function ListenerSection({ listeners, title }: { listeners: InspectedListener[]; title: string }) {
  if (!listeners.length) return null;
  return (
    <section className="flex flex-col gap-1.5" data-testid="component-listeners">
      <h2 className="label-caps">{title}</h2>
      <div className="flex flex-col rounded-xl border border-line bg-surface py-1">
        {listeners.map((listener, index) => (
          <div key={`${listener.type}:${index}`} className="flex min-h-7 min-w-0 items-center gap-3 px-3.5 py-0.5 text-[12.5px]" data-testid="component-listener">
            <span className="w-32 shrink-0 truncate font-mono text-fg-muted">{listener.type}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-fg">→ {listener.name || 'anonymous'}</span>
            {OPTION_LABEL.filter(([option]) => listener[option]).map(([option, label]) => (
              <Badge key={option}>{label}</Badge>
            ))}
            <CodeLink location={listener.location} />
          </div>
        ))}
      </div>
    </section>
  );
}
