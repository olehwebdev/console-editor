import { Add01Icon, LayoutTwoColumnIcon, MoreHorizontalIcon, UnfoldLessIcon } from '@hugeicons/core-free-icons';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { EditorTabs, type EditorTabItem } from '@/shared/ui/editor-tabs';
import { EmptyState } from '@/shared/ui/empty-state';
import { HoverHighlight, hoverRow } from '@/shared/ui/hover-highlight';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Kbd } from '@/shared/ui/kbd';
import { PanelResizer } from '@/shared/ui/panel-resizer';
import { Section } from '@/shared/ui/section';
import { Tree, TREE_ROW_HEIGHT, TreeLabel, TreeRow } from '@/shared/ui/tree';

const {
  CssIcon,
  DiffIcon,
  ExplorerIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  GlobeIcon,
  HtmlIcon,
  JsIcon,
  PreviewIcon,
  ReloadIcon,
  SearchIcon,
  SparklesIcon,
} = icons;

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <header className="mb-3 flex items-baseline gap-3">
        <h3 className="label-caps">{title}</h3>
        {hint ? <p className="text-xs text-fg-subtle">{hint}</p> : null}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

// ─── File tree ────────────────────────────────────────────────────────────────

type Kind = 'js' | 'css' | 'html';
type FileNode = { id: string; name: string; kind?: Kind; live?: boolean; origin?: boolean; children?: FileNode[] };

const KIND: Record<Kind, { glyph: IconGlyph; tint: string }> = {
  js: { glyph: JsIcon, tint: 'text-kind-js' },
  css: { glyph: CssIcon, tint: 'text-kind-css' },
  html: { glyph: HtmlIcon, tint: 'text-kind-html' },
};

const FILES: FileNode[] = [
  {
    id: 'app',
    name: 'app.example.com',
    origin: true,
    children: [
      {
        id: 'app/static',
        name: 'static',
        children: [
          {
            id: 'app/static/js',
            name: 'js',
            children: [
              { id: 'app/static/js/main', name: 'main.3f9a1c.js', kind: 'js', live: true },
              { id: 'app/static/js/vendor', name: 'vendor.8812aa.chunk.js', kind: 'js' },
              { id: 'app/static/js/runtime', name: 'runtime-main.js', kind: 'js' },
            ],
          },
          {
            id: 'app/static/css',
            name: 'css',
            children: [
              { id: 'app/static/css/main', name: 'main.c0ffee.css', kind: 'css', live: true },
              { id: 'app/static/css/theme', name: 'theme.css', kind: 'css' },
            ],
          },
        ],
      },
      { id: 'app/index', name: '(index)', kind: 'html' },
    ],
  },
  {
    id: 'cdn',
    name: 'cdn.jsdelivr.net',
    origin: true,
    children: [
      {
        id: 'cdn/npm',
        name: 'npm/react-dom@19',
        children: [{ id: 'cdn/npm/react-dom', name: 'react-dom.production.min.js', kind: 'js' }],
      },
    ],
  },
];

type FlatRow = { node: FileNode; depth: number; expanded?: boolean; count: number };

const countFiles = (node: FileNode): number => (node.children ? node.children.reduce((n, c) => n + countFiles(c), 0) : 1);

function matches(node: FileNode, query: string): boolean {
  if (!node.children) return node.name.toLowerCase().includes(query);
  return node.children.some((child) => matches(child, query));
}

function flatten(nodes: FileNode[], expanded: ReadonlySet<string>, query: string, depth = 0): FlatRow[] {
  return nodes.flatMap((node) => {
    if (query && !matches(node, query)) return [];
    if (!node.children) return [{ node, depth, count: 1 }];
    const open = query ? true : expanded.has(node.id);
    const row: FlatRow = { node, depth, expanded: open, count: countFiles(node) };
    return open ? [row, ...flatten(node.children, expanded, query, depth + 1)] : [row];
  });
}

function FileTreeBlock() {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(['app', 'app/static', 'app/static/js']));
  const [selected, setSelected] = useState('app/static/js/main');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const rows = useMemo(() => flatten(FILES, expanded, q), [expanded, q]);

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Block title="Tree · HoverHighlight · Section" hint="hover glides one pill; ↑↓←→ Home End Enter; type to filter">
      <div className="w-[300px] rounded-lg border border-line bg-surface py-1.5">
        <div className="px-2 pb-2">
          <Input
            size="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files"
            aria-label="Filter files"
            leading={<Icon icon={SearchIcon} size={14} className="text-fg-subtle" />}
          />
        </div>
        <Section
          title="Page resources"
          count={countFiles({ id: '', name: '', children: FILES })}
          actions={
            <>
              <IconButton icon={ReloadIcon} label="Reload resources" size="sm" />
              <IconButton icon={UnfoldLessIcon} label="Collapse all" size="sm" onClick={() => setExpanded(new Set())} />
            </>
          }
        >
          {rows.length ? (
            <Tree label="Page resources" className="px-1.5">
              {rows.map(({ node, depth, expanded: open, count }) => {
                const file = !node.children;
                const kind = node.kind ? KIND[node.kind] : null;
                return (
                  <TreeRow
                    key={node.id}
                    depth={depth}
                    expanded={open}
                    onToggle={file ? undefined : () => toggle(node.id)}
                    selected={file && node.id === selected}
                    icon={node.origin ? GlobeIcon : kind ? kind.glyph : open ? FolderOpenIcon : FolderIcon}
                    iconClassName={node.origin ? 'text-info' : kind ? kind.tint : 'text-fg-subtle'}
                    label={
                      file ? (
                        <TreeLabel text={node.name} highlight={q} className={node.live ? 'text-live' : undefined} />
                      ) : (
                        <span className={node.origin ? 'font-medium text-fg' : undefined}>{node.name}</span>
                      )
                    }
                    meta={file ? undefined : count}
                    title={node.name}
                    onClick={file ? () => setSelected(node.id) : undefined}
                    trailing={
                      file ? (
                        <span className="flex items-center gap-1">
                          <IconButton
                            icon={DiffIcon}
                            label="Compare"
                            size="sm"
                            noTooltip
                            tabIndex={-1}
                            className="size-5 opacity-0 transition-opacity group-hover/tree-row:opacity-100"
                          />
                          {node.live ? (
                            <span aria-label="Served from your override" role="img" className="size-1.5 rounded-full bg-live shadow-[0_0_8px_var(--live)]" />
                          ) : null}
                        </span>
                      ) : undefined
                    }
                  />
                );
              })}
            </Tree>
          ) : (
            <p className="px-4 py-3 text-[12px] text-fg-subtle">No files match “{query}”.</p>
          )}
        </Section>
      </div>
    </Block>
  );
}

// ─── Virtualized list ────────────────────────────────────────────────────────

const VIRTUAL_COUNT = 5000;

function VirtualBlock() {
  const scroller = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(3);
  const virtual = useVirtualizer({
    count: VIRTUAL_COUNT,
    getScrollElement: () => scroller.current,
    estimateSize: () => TREE_ROW_HEIGHT,
    overscan: 12,
  });

  return (
    <Block title="Virtualized" hint={`${VIRTUAL_COUNT.toLocaleString()} translated rows; the pill measures the hovered one`}>
      <div ref={scroller} className="h-56 w-[300px] overflow-y-auto overflow-x-hidden rounded-lg border border-line bg-surface">
        <Tree label="Chunks" className="px-1.5" style={{ height: virtual.getTotalSize() }}>
          {virtual.getVirtualItems().map((item) => {
            const i = item.index;
            const depth = i % 7 === 0 ? 0 : 1;
            return (
              <div key={item.key} className="absolute inset-x-1.5 top-0" style={{ transform: `translateY(${item.start}px)`, height: TREE_ROW_HEIGHT }}>
                <TreeRow
                  depth={depth}
                  expanded={depth === 0 ? true : undefined}
                  selected={i === selected}
                  icon={depth === 0 ? FolderOpenIcon : JsIcon}
                  iconClassName={depth === 0 ? 'text-fg-subtle' : 'text-kind-js'}
                  label={depth === 0 ? `bundle-${i / 7}` : `chunk.${i.toString(16).padStart(4, '0')}.js`}
                  meta={depth === 0 ? 6 : undefined}
                  onClick={() => setSelected(i)}
                />
              </div>
            );
          })}
        </Tree>
      </div>
    </Block>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function SectionsBlock() {
  const [editorsOpen, setEditorsOpen] = useState(true);
  const overrides = ['main.3f9a1c.js', 'main.c0ffee.css', 'checkout.js', 'analytics.js', 'theme.css', 'app.js'];

  return (
    <Block title="Section" hint="caps header, count pill, hover actions, height animation, sticky, controlled">
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-72 w-[300px] overflow-y-auto rounded-lg border border-line bg-surface">
          <Section
            title="Overrides"
            count={overrides.length}
            countTone="live"
            sticky
            actions={<IconButton icon={Add01Icon} label="New override" size="sm" />}
          >
            <HoverHighlight className="px-1.5 pb-1" role="list" aria-label="Overrides">
              {overrides.map((name) => (
                <div key={name} role="listitem" {...hoverRow} className="flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-fg-muted hover:text-fg">
                  <Icon icon={name.endsWith('.css') ? CssIcon : JsIcon} size={14} className={name.endsWith('.css') ? 'text-kind-css' : 'text-kind-js'} />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="size-1.5 rounded-full bg-live" aria-label="Live" role="img" />
                </div>
              ))}
            </HoverHighlight>
          </Section>
          <Section
            title="Open editors"
            count={2}
            sticky
            open={editorsOpen}
            onOpenChange={setEditorsOpen}
            actionsVisible="always"
            actions={<IconButton icon={MoreHorizontalIcon} label="More" size="sm" />}
          >
            <p className="px-4 pb-2 text-[12px] leading-relaxed text-fg-subtle">
              Controlled: the button on the right toggles this section from outside. Sticky headers stay pinned while the list scrolls.
            </p>
          </Section>
          <Section title="Outline" sticky defaultOpen={false} keepMounted>
            <p className="px-4 pb-2 text-[12px] leading-relaxed text-fg-subtle">Collapsed by default, kept mounted (inert) while closed.</p>
          </Section>
          <Section title="Timeline" collapsible={false} count={0}>
            <p className="px-4 pb-3 text-[12px] text-fg-subtle">A static header (collapsible=false).</p>
          </Section>
        </div>
        <Button size="sm" onClick={() => setEditorsOpen((v) => !v)}>
          {editorsOpen ? 'Collapse' : 'Expand'} “Open editors”
        </Button>
      </div>
    </Block>
  );
}

// ─── Editor tabs ─────────────────────────────────────────────────────────────

const NEW_FILES: Array<Pick<EditorTabItem, 'label' | 'tone'> & { kind: Kind }> = [
  { label: 'checkout.js', kind: 'js', tone: 'js' },
  { label: 'print.css', kind: 'css', tone: 'css' },
  { label: 'embed.html', kind: 'html', tone: 'html' },
  { label: 'analytics.min.js', kind: 'js', tone: 'js' },
  { label: 'fonts.css', kind: 'css', tone: 'css' },
];

function EditorTabsBlock() {
  const seed = useRef(0);
  const [tabs, setTabs] = useState<EditorTabItem[]>([
    { id: 'main', label: 'main.3f9a1c.js', icon: JsIcon, tone: 'js', dirty: true, title: 'https://app.example.com/static/js/main.3f9a1c.js' },
    { id: 'css', label: 'main.c0ffee.css', icon: CssIcon, tone: 'css', title: 'https://app.example.com/static/css/main.c0ffee.css' },
    { id: 'index', label: '(index)', icon: HtmlIcon, tone: 'html', italic: true, title: 'https://app.example.com/\nNot saved as an override yet' },
  ]);
  const [activeId, setActiveId] = useState<string | null>('main');
  const active = tabs.find((t) => t.id === activeId) ?? null;

  const add = () => {
    const file = NEW_FILES[seed.current++ % NEW_FILES.length];
    const id = `tab-${seed.current}`;
    setTabs((current) => [...current, { id, label: file.label, icon: KIND[file.kind].glyph, tone: file.tone, italic: true }]);
    setActiveId(id);
  };

  const close = (id: string) => {
    const index = tabs.findIndex((t) => t.id === id);
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (id === activeId) setActiveId((next[index] ?? next[index - 1])?.id ?? null);
  };

  const patch = (id: string, change: Partial<EditorTabItem>) => setTabs((current) => current.map((t) => (t.id === id ? { ...t, ...change } : t)));

  return (
    <Block title="EditorTabs" hint="pill glide, grow in / shrink out, dirty dot ↔ close, middle-click, wheel scroll, drag to reorder, ←→ Enter Delete">
      <div className="overflow-hidden rounded-lg border border-line bg-surface-editor">
        <EditorTabs
          className="border-b border-line bg-surface"
          items={tabs}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={close}
          onReorder={(ids) => setTabs((current) => ids.map((id) => current.find((t) => t.id === id)!))}
          onTabDoubleClick={(id) => patch(id, { italic: false })}
          trailing={
            <>
              <IconButton icon={Add01Icon} label="Open a file" size="sm" onClick={add} />
              <IconButton icon={LayoutTwoColumnIcon} label="Split editor" size="sm" />
            </>
          }
        />
        <div className="flex h-36 items-center justify-center">
          {active ? (
            <div className="flex flex-col items-center gap-2 text-[13px] text-fg-muted">
              <span className="font-mono text-xs text-fg-subtle">{active.title ?? active.label}</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => patch(active.id, { dirty: !active.dirty })}>
                  {active.dirty ? 'Save' : 'Make an edit'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => patch(active.id, { italic: !active.italic })}>
                  {active.italic ? 'Keep open' : 'Make preview'}
                </Button>
              </div>
              <span className="text-xs text-fg-subtle">Double-click a tab to keep it open.</span>
            </div>
          ) : (
            <EmptyState icon={FileIcon} title="No open files" size="sm" actions={<Button size="sm" onClick={add}>Open a file</Button>} />
          )}
        </div>
      </div>
    </Block>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyStateBlock() {
  const [replay, setReplay] = useState(0);
  return (
    <Block title="EmptyState" hint="fade-up stagger on mount (md for panes, sm for sidebars)">
      <div className="flex flex-wrap items-stretch gap-4">
        <div key={`md-${replay}`} className="flex min-h-64 flex-1 items-center justify-center rounded-lg border border-line bg-surface-editor py-8">
          <EmptyState
            icon={SparklesIcon}
            title="Patch a live website without rebuilding it"
            actions={
              <>
                <Button variant="primary" leading={<Icon icon={PreviewIcon} size={14} />}>
                  Open a page
                </Button>
                <Button variant="ghost" trailing={<Kbd keys={['mod', 'K']} />}>
                  Commands
                </Button>
              </>
            }
          >
            Pick a script or stylesheet from the page, edit it and save: the page reloads running your version.
          </EmptyState>
        </div>
        <div key={`sm-${replay}`} className="flex w-[260px] items-center rounded-lg border border-line bg-surface py-8">
          <EmptyState icon={ExplorerIcon} title="No files yet" size="sm">
            Scripts, stylesheets and HTML the page loads show up here.
          </EmptyState>
        </div>
      </div>
      <div>
        <Button size="sm" variant="ghost" leading={<Icon icon={ReloadIcon} size={14} />} onClick={() => setReplay((n) => n + 1)}>
          Replay entrance
        </Button>
      </div>
    </Block>
  );
}

// ─── Panel resizer ───────────────────────────────────────────────────────────

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function ResizerBlock() {
  const [sidebar, setSidebar] = useState(180);
  const [preview, setPreview] = useState(200);
  const [bottom, setBottom] = useState(72);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{ start: number } | null>(null);

  return (
    <Block title="PanelResizer" hint="drag, or focus and use ←→ (Shift = ×4), Home/End, Enter / double-click resets">
      <div className="flex h-64 overflow-hidden rounded-lg border border-line bg-canvas text-xs text-fg-subtle">
        <aside className="relative shrink-0 border-r border-line bg-surface p-3" style={{ width: sidebar }}>
          <span className="label-caps">Sidebar</span>
          <p className="mt-1 tabular-nums">{sidebar}px</p>
          {/* Pinned to the panel edge (absolute), the way the app's sidebar uses it. */}
          <PanelResizer
            className="absolute inset-y-0 -right-1"
            aria-label="Resize sidebar"
            value={sidebar}
            min={120}
            max={320}
            onResizeStart={() => {
              drag.current = { start: sidebar };
              setResizing(true);
            }}
            onResize={(delta, total) => {
              const from = drag.current;
              setSidebar((w) => clamp(from ? from.start + total : w + delta, 120, 320));
            }}
            onResizeEnd={() => {
              drag.current = null;
              setResizing(false);
            }}
            onReset={() => setSidebar(180)}
          />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 bg-surface-editor p-3">
            <span className="label-caps">Editor</span>
            <p className="mt-1">{resizing ? 'Resizing…' : 'In-flow handles take no width.'}</p>
          </div>
          <PanelResizer
            orientation="horizontal"
            aria-label="Resize bottom panel"
            hairline
            value={bottom}
            min={32}
            max={160}
            onResize={(delta) => setBottom((h) => clamp(h - delta, 32, 160))}
            onReset={() => setBottom(72)}
          />
          <div className="shrink-0 bg-surface p-3" style={{ height: bottom }}>
            <span className="label-caps">Panel</span>
            <p className="mt-1 tabular-nums">{bottom}px</p>
          </div>
        </div>
        <PanelResizer
          aria-label="Resize preview"
          value={preview}
          min={120}
          max={320}
          onResize={(delta) => setPreview((w) => clamp(w - delta, 120, 320))}
          onReset={() => setPreview(200)}
        />
        <div className="shrink-0 border-l border-line bg-surface p-3" style={{ width: preview }}>
          <span className="label-caps">Preview</span>
          <p className="mt-1 tabular-nums">{preview}px</p>
        </div>
      </div>
      <p className="text-xs text-fg-subtle">
        The sidebar handle is pinned with <code className="font-mono">absolute</code> and clamps from <code className="font-mono">totalPx</code> (no drift
        past the limits); the in-flow handles add <code className="font-mono">deltaPx</code>.
      </p>
    </Block>
  );
}

/** Gallery section for the STRUCTURE group of shared/ui. */
export function StructureSection() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <FileTreeBlock />
        <VirtualBlock />
      </div>
      <SectionsBlock />
      <EditorTabsBlock />
      <EmptyStateBlock />
      <ResizerBlock />
    </div>
  );
}
