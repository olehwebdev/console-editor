import { useEffect, useMemo, useState } from 'react';
import { icons, KEY, TOAST_DURATION } from '@/shared/config';
import { CommandPalette, type CommandGroup } from '@/shared/ui/command-palette';
import { confirm, isConfirmOpen } from '@/shared/ui/dialog';
import { Icon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { Kbd } from '@/shared/ui/kbd';
import { ContextMenu, Menu, type MenuItem } from '@/shared/ui/menu';
import { Popover } from '@/shared/ui/popover';
import { focusToasts, toast } from '@/shared/ui/toast';
import { DemoButton } from './DemoButton';
import { Row } from './Row';
import { say } from './say';

const { ChevronDownIcon, CopyIcon, CssIcon, DeleteIcon, DiffIcon, ExternalLinkIcon, FileIcon, HtmlIcon, JsIcon, LiveIcon, PrettifyIcon, ReloadIcon, SaveIcon, SettingsIcon } = icons;

/**
 * Shortcuts the demos show, in Kbd's notation (`mod` is ⌘ on macOS, Ctrl elsewhere).
 * Not `as const`: MenuItem, CommandGroup and Kbd take a mutable `string[]`.
 */
const SHORTCUT = {
  save: ['mod', 'S'],
  format: ['shift', 'alt', 'F'],
  copyUrl: ['mod', 'shift', 'C'],
  open: ['enter'],
  reload: ['mod', 'R'],
  settings: ['mod', ','],
  palette: ['mod', 'K'],
  focusToasts: ['alt', 'N'],
} satisfies Record<string, string[]>;

/** The palette hotkey's `event.key`, lowercased (Shift or Caps Lock may capitalize it). */
const PALETTE_KEY = 'k';
/** Alt+N is matched by `event.code`: on macOS, Alt turns N into a dead key. */
const FOCUS_TOASTS_CODE = 'KeyN';

const KINDS = [
  { ext: 'js', icon: JsIcon, dir: 'static/js' },
  { ext: 'css', icon: CssIcon, dir: 'static/css' },
  { ext: 'html', icon: HtmlIcon, dir: 'pages' },
] as const;

/** The palette's resource rows: enough to exercise the virtualized list. */
const RESOURCE_COUNT = 2000;
const RESOURCE_NAMES = ['main', 'vendor', 'chunk', 'app', 'runtime'];
const RESOURCE_ID_PREFIX = 'r';

/** How long the demo save runs before its toast turns into "saved". */
const SAVE_FLOW_MS = 1200;

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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === PALETTE_KEY) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.altKey && event.code === FOCUS_TOASTS_CODE) {
        if (focusToasts()) event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const fileMenu: MenuItem[] = [
    { label: 'Save override', icon: SaveIcon, shortcut: SHORTCUT.save, onSelect: () => say('Saved') },
    { label: 'Format document', icon: PrettifyIcon, shortcut: SHORTCUT.format, onSelect: () => say('Formatted') },
    { label: 'Compare with original', icon: DiffIcon, onSelect: () => say('Diff opened') },
    { label: 'Word wrap', checked: wordWrap, onSelect: () => setWordWrap((w) => !w) },
    { separator: true },
    { label: 'Copy URL', icon: CopyIcon, shortcut: SHORTCUT.copyUrl, onSelect: () => say('URL copied') },
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
    { label: 'Open', icon: FileIcon, shortcut: SHORTCUT.open, onSelect: () => say('Opened') },
    { label: 'Override', icon: LiveIcon, onSelect: () => toast({ title: 'Override active', tone: 'success' }) },
    { label: 'Copy URL', icon: CopyIcon, onSelect: () => say('URL copied') },
    { separator: true },
    { label: 'Reload page', icon: ReloadIcon, shortcut: SHORTCUT.reload, onSelect: () => say('Reloaded') },
  ];

  const groups = useMemo<CommandGroup[]>(
    () => [
      {
        heading: 'Commands',
        items: [
          { id: 'save', label: 'Save override', icon: SaveIcon, shortcut: SHORTCUT.save, onSelect: () => say('Saved') },
          { id: 'format', label: 'Format document', icon: PrettifyIcon, shortcut: SHORTCUT.format, keywords: ['prettify', 'beautify'], onSelect: () => say('Formatted') },
          { id: 'diff', label: 'Compare changes', icon: DiffIcon, keywords: ['diff'], onSelect: () => say('Diff opened') },
          { id: 'reload', label: 'Reload page', icon: ReloadIcon, shortcut: SHORTCUT.reload, onSelect: () => say('Reloaded') },
          { id: 'settings', label: 'Open settings', icon: SettingsIcon, shortcut: SHORTCUT.settings, keywords: ['preferences'], onSelect: () => say('Settings') },
        ],
      },
      {
        heading: 'Resources',
        items: Array.from({ length: RESOURCE_COUNT }, (_, i) => {
          const kind = KINDS[i % KINDS.length]!;
          const name = `${RESOURCE_NAMES[i % RESOURCE_NAMES.length]}-${i.toString(36)}.${kind.ext}`;
          return {
            id: `${RESOURCE_ID_PREFIX}${i}`,
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
    const id = toast({ title: 'Saving override…', description: 'Writing main.js to disk', duration: TOAST_DURATION.pending });
    window.setTimeout(
      () => toast.update(id, { title: 'Override saved', description: 'Served on next reload', tone: 'success', duration: TOAST_DURATION.normal }),
      SAVE_FLOW_MS,
    );
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
            <Input autoFocus defaultValue="Checkout fix" onKeyDown={(e) => e.key === KEY.enter && setPopoverOpen(false)} />
          </div>
        </Popover>
      </Row>

      <Row title="Command palette" note="Fuzzy filter, 2 000 virtualized resources.">
        <DemoButton onClick={() => setPaletteOpen(true)}>
          Open palette <Kbd keys={SHORTCUT.palette} />
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
        <DemoButton onClick={() => toast({ title: 'Sticky toast', description: 'Stays until dismissed', duration: TOAST_DURATION.pending })}>Sticky</DemoButton>
        <DemoButton onClick={() => toast.dismiss()}>Dismiss all</DemoButton>
        <DemoButton
          onClick={() => {
            if (!focusToasts()) say('No toasts to focus');
          }}
        >
          Focus stack <Kbd keys={SHORTCUT.focusToasts} />
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
