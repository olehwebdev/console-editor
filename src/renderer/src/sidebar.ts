import type { OverrideMeta, ResourceEntry } from '../../shared/types';
import { fileName, h, KIND_LABEL, origin, pathOf } from './dom';
import { icon } from './icons';

export interface SidebarProps {
  filter: string;
  overrides: OverrideMeta[];
  resources: ResourceEntry[];
  hits: Map<string, number>;
  upstreamChanged: Set<string>;
  activeUrl: string | null;
  activeOverrideId: string | null;
  onOpenResource(url: string): void;
  onOpenOverride(id: string): void;
  onToggleOverride(id: string, enabled: boolean): void;
  onDeleteOverride(id: string): void;
}

function matchesFilter(filter: string, ...texts: string[]): boolean {
  if (!filter) return true;
  const needle = filter.toLowerCase();
  return texts.some((t) => t.toLowerCase().includes(needle));
}

function kindBadge(kind: keyof typeof KIND_LABEL) {
  return h('span', { class: `kind kind-${kind.toLowerCase()}` }, KIND_LABEL[kind]);
}

export function renderSidebar(root: HTMLElement, p: SidebarProps): void {
  const overrides = p.overrides
    .filter((o) => matchesFilter(p.filter, o.sourceUrl, o.match.pattern))
    .sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));

  const overrideRows = overrides.map((o) => {
    const hits = p.hits.get(o.id) ?? 0;
    const changed = p.upstreamChanged.has(o.id);
    return h(
      'li',
      {
        class: `row override-row${o.id === p.activeOverrideId ? ' active' : ''}${o.enabled ? '' : ' disabled'}`,
        title: `${o.sourceUrl}\nmatch (${o.match.type}): ${o.match.pattern}`,
        'data-override-id': o.id,
        onClick: () => p.onOpenOverride(o.id),
      },
      h('input', {
        type: 'checkbox',
        checked: o.enabled,
        title: o.enabled ? 'Disable override' : 'Enable override',
        onClick: (e: Event) => e.stopPropagation(),
        onChange: (e: Event) => p.onToggleOverride(o.id, (e.target as HTMLInputElement).checked),
      }),
      kindBadge(o.kind),
      h('span', { class: 'name' }, fileName(o.sourceUrl)),
      o.match.type !== 'exact' ? h('span', { class: 'pill', title: o.match.pattern }, o.match.type) : null,
      changed ? h('span', { class: 'warn', title: 'The live file changed since this override was created' }, icon('warning')) : null,
      hits ? h('span', { class: 'hits', title: `Served ${hits}× this session` }, String(hits)) : null,
      h(
        'button',
        {
          class: 'icon-button row-action',
          title: 'Delete override',
          onClick: (e: Event) => {
            e.stopPropagation();
            p.onDeleteOverride(o.id);
          },
        },
        icon('trash'),
      ),
    );
  });

  const byOrigin = new Map<string, ResourceEntry[]>();
  for (const r of p.resources) {
    if (!matchesFilter(p.filter, r.url)) continue;
    const key = origin(r.url);
    if (!byOrigin.has(key)) byOrigin.set(key, []);
    byOrigin.get(key)!.push(r);
  }
  const kindOrder = { Document: 0, Script: 1, Stylesheet: 2 };
  const resourceGroups = [...byOrigin.entries()].map(([host, entries]) =>
    h(
      'li',
      { class: 'group' },
      h('div', { class: 'group-title', title: host }, host.replace(/^https?:\/\//, '')),
      h(
        'ul',
        {},
        ...entries
          .sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || pathOf(a.url).localeCompare(pathOf(b.url)))
          .map((r) =>
            h(
              'li',
              {
                class: `row resource-row${r.url === p.activeUrl ? ' active' : ''}${r.overrideId ? ' overridden' : ''}`,
                title: `${r.url}\n${r.mimeType} · ${r.status}${r.overrideId ? ' · served from override' : ''}`,
                'data-url': r.url,
                onClick: () => p.onOpenResource(r.url),
              },
              kindBadge(r.kind),
              h('span', { class: 'name' }, pathOf(r.url)),
              r.overrideId ? h('span', { class: 'dot', title: 'Served from an override' }) : null,
            ),
          ),
      ),
    ),
  );

  root.replaceChildren(
    h(
      'section',
      { class: 'panel' },
      h('h2', {}, `Overrides`, h('span', { class: 'count' }, String(overrides.length))),
      overrideRows.length
        ? h('ul', { class: 'list' }, ...overrideRows)
        : h('p', { class: 'hint' }, 'Open a file from the page, edit it and press Ctrl/Cmd+S to create an override.'),
    ),
    h(
      'section',
      { class: 'panel' },
      h('h2', {}, 'Page resources', h('span', { class: 'count' }, String(p.resources.length))),
      resourceGroups.length
        ? h('ul', { class: 'list' }, ...resourceGroups)
        : h('p', { class: 'hint' }, 'Scripts, stylesheets and documents the page loads will appear here.'),
    ),
  );
}
