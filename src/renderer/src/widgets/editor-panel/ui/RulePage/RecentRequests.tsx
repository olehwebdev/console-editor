import { useRuleStore } from '@/entities/rule';

/** The URLs a rule changed lately, newest first, with how often: requests the tree doesn't list (fetches, beacons) show here. */
export function RecentRequests({ ruleId }: { ruleId: string }) {
  const recent = useRuleStore((s) => s.recent[ruleId]);
  return (
    <section className="flex flex-col gap-2" data-testid="rule-recent">
      <h2 className="label-caps">Recent requests</h2>
      {recent?.length ? (
        <ul className="flex flex-col rounded-lg border border-line" aria-label="Recent requests">
          {recent.map((request) => (
            <li key={request.url} className="flex h-7 items-center gap-3 border-b border-line px-3 last:border-b-0">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-fg-muted" title={request.url}>
                {request.url}
              </span>
              <span className="shrink-0 text-[11.5px] tabular-nums text-fg-subtle">×{request.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px] text-fg-subtle">Nothing matched yet: rules apply from the next request.</p>
      )}
    </section>
  );
}
