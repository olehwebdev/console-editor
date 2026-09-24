import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { icons } from '@/shared/config';
import { cn } from '@/shared/lib';
import { CommandPalette, type CommandGroup } from '@/shared/ui/command-palette';
import { confirm, isConfirmOpen } from '@/shared/ui/dialog';
import { Icon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { Kbd } from '@/shared/ui/kbd';
import { ContextMenu, Menu, type MenuItem } from '@/shared/ui/menu';
import { Popover } from '@/shared/ui/popover';
import { focusToasts, toast } from '@/shared/ui/toast';

const { ChevronDownIcon, CopyIcon, CssIcon, DeleteIcon, DiffIcon, ExternalLinkIcon, FileIcon, HtmlIcon, JsIcon, LiveIcon, PrettifyIcon, ReloadIcon, SaveIcon, SettingsIcon } = icons;

/** Plain token-styled button (the shared Button lands separately). */
function DemoButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-lg bg-surface-raised px-3 text-[13px] font-medium text-fg shadow-raised transition-colors hover:bg-pressed data-[state=open]:bg-pressed',
        className,
      )}
    />
  );
}

function Row({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-6 border-t border-line py-5">
      <div>
        <div className="text-[13px] font-medium text-fg">{title}</div>
        {note ? <div className="mt-1 text-xs text-fg-subtle">{note}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const say = (what: string) => toast({ title: what, duration: 1600 });

const KINDS = [
  { ext: 'js', icon: JsIcon, dir: 'static/js' },
  { ext: 'css', icon: CssIcon, dir: 'static/css' },
  { ext: 'html', icon: HtmlIcon, dir: 'pages' },
] as const;

/** Every overlay in its main states: dropdown & context menus, palette, toasts, confirm. */
export function OverlaysSection() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [answer, setAnswer] = useState<string>('—');
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Gallery-only hotkeys; the app binds its own. Held keys and an open confirm dialog are ignored.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isConfirmOpen()) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.altKey && event.code === 'KeyN') {
        if (focusToasts()) event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const fileMenu: MenuItem[] = [
    { label: 'Save override', icon: SaveIcon, shortcut: ['mod', 'S'], onSelect: () => say('Saved') },
    { label: 'Format document', icon: PrettifyIcon, shortcut: ['shift', 'alt', 'F'], onSelect: () => say('Formatted') },
    { label: 'Compare with original', icon: DiffIcon, onSelect: () => say('Diff opened') },
    { label: 'Word wrap', checked: wordWrap, onSelect: () => setWordWrap((w) => !w) },
    { separator: true },
    { label: 'Copy URL', icon: CopyIcon, shortcut: ['mod', 'shift', 'C'], onSelect: () => say('URL copied') },
    { label: 'Open in browser', icon: ExternalLinkIcon, disabled: true, onSelect: () => undefined },
    { separator: true },
    {
      label: 'Delete override',
      icon: DeleteIcon,
      danger: true,
      onSelect: async () => {
        const ok = await confirm({
          title: 'Delete override?',
          body: 'main.js will be served from the network again. This cannot be undone.',
          confirmLabel: 'Delete',
          tone: 'danger',
        });
        setAnswer(ok ? 'Deleted' : 'Kept');
      },
    },
  ];

  const rowMenu: MenuItem[] = [
    { label: 'Open', icon: FileIcon, shortcut: ['enter'], onSelect: () => say('Opened') },
    { label: 'Override', icon: LiveIcon, onSelect: () => toast({ title: 'Override active', tone: 'success' }) },
    { label: 'Copy URL', icon: CopyIcon, onSelect: () => say('URL copied') },
    { separator: true },
    { label: 'Reload page', icon: ReloadIcon, shortcut: ['mod', 'R'], onSelect: () => say('Reloaded') },
  ];

  const groups = useMemo<CommandGroup[]>(
    () => [
      {
        heading: 'Commands',
        items: [
          { id: 'save', label: 'Save override', icon: SaveIcon, shortcut: ['mod', 'S'], onSelect: () => say('Saved') },
          { id: 'format', label: 'Format document', icon: PrettifyIcon, shortcut: ['shift', 'alt', 'F'], keywords: ['prettify', 'beautify'], onSelect: () => say('Formatted') },
          { id: 'diff', label: 'Compare changes', icon: DiffIcon, keywords: ['diff'], onSelect: () => say('Diff opened') },
          { id: 'reload', label: 'Reload page', icon: ReloadIcon, shortcut: ['mod', 'R'], onSelect: () => say('Reloaded') },
          { id: 'settings', label: 'Open settings', icon: SettingsIcon, shortcut: ['mod', ','], keywords: ['preferences'], onSelect: () => say('Settings') },
        ],
      },
      {
        heading: 'Resources',
        // 2 000 rows to exercise the virtualized list.
        items: Array.from({ length: 2000 }, (_, i) => {
          const kind = KINDS[i % KINDS.length]!;
          const name = `${['main', 'vendor', 'chunk', 'app', 'runtime'][i % 5]}-${i.toString(36)}.${kind.ext}`;
          return {
            id: `r${i}`,
            label: name,
            hint: `cdn.example.com/${kind.dir}`,
            icon: kind.icon,
            onSelect: () => say(`Opened ${name}`),
          };
        }),
      },
    ],
    [],
  );

  const saveFlow = () => {
    const id = toast({ title: 'Saving override…', description: 'Writing main.js to disk', duration: 0 });
    window.setTimeout(() => toast.update(id, { title: 'Override saved', description: 'Served on next reload', tone: 'success', duration: 4000 }), 1200);
  };

  return (
    <section className="max-w-4xl">
      <h2 className="label-caps mb-2">Overlays</h2>

      <Row title="Menu" note="Click, or focus + Enter / ↓ (↑ opens on the last item). Arrows, typeahead, Esc.">
        <Menu items={fileMenu} label="File actions">
          <DemoButton>
            File actions <Icon icon={ChevronDownIcon} size={14} className="text-fg-muted" />
          </DemoButton>
        </Menu>
        <Menu items={rowMenu} align="end" label="Resource actions">
          <DemoButton>Aligned end</DemoButton>
        </Menu>
        <Menu items={rowMenu} side="top" label="Resource actions">
          <DemoButton>Opens up</DemoButton>
        </Menu>
      </Row>

      <Row title="Context menu" note="Right-click, or Shift+F10 on the focused area.">
        <ContextMenu items={fileMenu} label="Editor actions">
          <div
            tabIndex={0}
            className="grid h-28 w-full max-w-md place-items-center rounded-xl border border-dashed border-line-strong bg-surface-editor text-fg-muted outline-none focus-visible:border-accent/60"
          >
            Right-click anywhere in here
          </div>
        </ContextMenu>
      </Row>

      <Row title="Popover" note="A few controls beside an element. Not modal: Esc, a press or focus outside it close it.">
        <DemoButton
          data-state={popoverOpen ? 'open' : 'closed'}
          onClick={(e) => {
            setPopoverAnchor(e.currentTarget);
            setPopoverOpen(true);
          }}
        >
          Rename…
        </DemoButton>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen} anchor={popoverAnchor} side="bottom" label="Rename">
          <div className="flex w-[220px] flex-col gap-2">
            <span className="label-caps">Name</span>
            <Input autoFocus defaultValue="Checkout fix" onKeyDown={(e) => e.key === 'Enter' && setPopoverOpen(false)} />
          </div>
        </Popover>
      </Row>

      <Row title="Command palette" note="Fuzzy filter, 2 000 virtualized resources.">
        <DemoButton onClick={() => setPaletteOpen(true)}>
          Open palette <Kbd keys={['mod', 'K']} />
        </DemoButton>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} groups={groups} placeholder="Search commands and resources…" />
      </Row>

      <Row title="Toast" note="Hover or focus to fan out; swipe or Esc to dismiss. Alt+N (focusToasts) jumps to the stack.">
        <DemoButton onClick={() => toast({ title: 'Reloaded page', description: 'example.com · 42 resources' })}>Neutral</DemoButton>
        <DemoButton onClick={() => toast({ title: 'Override active', description: 'main.js is served from disk', tone: 'success' })}>Success</DemoButton>
        <DemoButton
          onClick={() =>
            toast({
              title: 'Upstream changed',
              description: 'The original main.js differs from your base.',
              tone: 'warning',
              action: { label: 'Compare', onClick: () => say('Diff opened') },
            })
          }
        >
          Warning + action
        </DemoButton>
        <DemoButton onClick={() => toast({ title: 'Could not save', description: 'EACCES: permission denied', tone: 'danger' })}>Danger</DemoButton>
        <DemoButton onClick={saveFlow}>Update in place</DemoButton>
        <DemoButton onClick={() => toast({ title: 'Sticky toast', description: 'Stays until dismissed', duration: 0 })}>Sticky</DemoButton>
        <DemoButton onClick={() => toast.dismiss()}>Dismiss all</DemoButton>
        <DemoButton
          onClick={() => {
            if (!focusToasts()) say('No toasts to focus');
          }}
        >
          Focus stack <Kbd keys={['alt', 'N']} />
        </DemoButton>
      </Row>

      <Row title="Confirm dialog" note="Enter confirms, Esc cancels, Tab is trapped.">
        <DemoButton
          onClick={async () => {
            const ok = await confirm({
              title: 'Delete override?',
              body: 'main.js will be served from the network again.',
              confirmLabel: 'Delete',
              tone: 'danger',
            });
            setAnswer(ok ? 'Confirmed (danger)' : 'Cancelled (danger)');
          }}
        >
          Danger
        </DemoButton>
        <DemoButton
          onClick={async () => {
            const ok = await confirm({ title: 'Reload the page?', body: 'Unsaved edits stay in the editor.', confirmLabel: 'Reload' });
            setAnswer(ok ? 'Confirmed (accent)' : 'Cancelled (accent)');
          }}
        >
          Accent
        </DemoButton>
        <span className="ml-2 text-xs text-fg-subtle">
          Last answer: <span className="font-mono text-fg-muted">{answer}</span>
        </span>
      </Row>
      {/* No <ToastStack/> or <ConfirmDialog/> here: App mounts the hosts (with their real placement) in every mode. */}
    </section>
  );
}

export { OverlaysSection as Overlays };
