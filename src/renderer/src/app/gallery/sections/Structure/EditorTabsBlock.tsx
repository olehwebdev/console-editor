import { Add01Icon, LayoutTwoColumnIcon } from '@hugeicons/core-free-icons';
import { useRef, useState } from 'react';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { EditorTabs, type EditorTabItem } from '@/shared/ui/editor-tabs';
import { EmptyState } from '@/shared/ui/empty-state';
import { IconButton } from '@/shared/ui/icon-button';
import { Block } from '../../Block';
import { KIND } from './constants';
import type { Kind } from './types';

const { CssIcon, FileIcon, HtmlIcon, JsIcon } = icons;

const NEW_FILES: Array<Pick<EditorTabItem, 'label' | 'tone'> & { kind: Kind }> = [
  { label: 'checkout.js', kind: 'js', tone: 'js' },
  { label: 'print.css', kind: 'css', tone: 'css' },
  { label: 'embed.html', kind: 'html', tone: 'html' },
  { label: 'analytics.min.js', kind: 'js', tone: 'js' },
  { label: 'fonts.css', kind: 'css', tone: 'css' },
];

/** The tab in front at first. */
const MAIN_TAB_ID = 'main';
/** Tabs opened by the demo are numbered after this. */
const NEW_TAB_ID_PREFIX = 'tab-';

export function EditorTabsBlock() {
  const seed = useRef(0);
  const [tabs, setTabs] = useState<EditorTabItem[]>([
    { id: MAIN_TAB_ID, label: 'main.3f9a1c.js', icon: JsIcon, tone: 'js', dirty: true, title: 'https://app.example.com/static/js/main.3f9a1c.js' },
    { id: 'css', label: 'main.c0ffee.css', icon: CssIcon, tone: 'css', title: 'https://app.example.com/static/css/main.c0ffee.css' },
    { id: 'index', label: '(index)', icon: HtmlIcon, tone: 'html', italic: true, title: 'https://app.example.com/\nNot saved as an override yet' },
  ]);
  const [activeId, setActiveId] = useState<string | null>(MAIN_TAB_ID);
  const active = tabs.find((t) => t.id === activeId) ?? null;

  const add = () => {
    const file = NEW_FILES[seed.current++ % NEW_FILES.length];
    const id = `${NEW_TAB_ID_PREFIX}${seed.current}`;
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
