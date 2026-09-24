import { Add01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { icons } from '@/shared/config';
import { Badge } from '@/shared/ui/badge';
import { Button, Swap } from '@/shared/ui/button';
import { Counter } from '@/shared/ui/counter';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Kbd } from '@/shared/ui/kbd';
import { Shimmer, Skeleton, Spinner } from '@/shared/ui/spinner';
import { Switch } from '@/shared/ui/switch';
import { setNativeViewRect } from '@/shared/lib';
import { Tooltip } from '@/shared/ui/tooltip';

const {
  CheckIcon,
  CloseIcon,
  DeleteIcon,
  DevToolsIcon,
  DiffIcon,
  ExplorerIcon,
  GlobeIcon,
  LiveIcon,
  OverridesIcon,
  PrettifyIcon,
  PreviewIcon,
  ReloadIcon,
  SaveIcon,
  SearchIcon,
  SettingsIcon,
  WarningIcon,
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

function Row({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label ? <span className="w-20 shrink-0 text-xs text-fg-subtle">{label}</span> : null}
      {children}
    </div>
  );
}

type SaveState = 'idle' | 'saving' | 'saved';

/** Save → spinner → "Saved ✓" → Save, the way the editor's save button behaves. */
function SaveDemo() {
  const [state, setState] = useState<SaveState>('idle');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const save = () => {
    setState('saving');
    timers.current.push(
      window.setTimeout(() => setState('saved'), 700),
      window.setTimeout(() => setState('idle'), 2100),
    );
  };

  return (
    <Button
      variant="primary"
      loading={state === 'saving'}
      onClick={state === 'idle' ? save : undefined}
      leading={
        <Swap value={state === 'saved' ? 'check' : 'save'}>
          <Icon icon={state === 'saved' ? CheckIcon : SaveIcon} size={14} />
        </Swap>
      }
      trailing={
        state === 'idle' ? (
          <Kbd
            keys={['mod', 'S']}
            className="opacity-70 [&_kbd]:border-accent-fg/20 [&_kbd]:bg-transparent [&_kbd]:text-accent-fg"
          />
        ) : null
      }
    >
      <Swap value={state}>{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Save override'}</Swap>
    </Button>
  );
}

function ButtonsBlock() {
  const [loading, setLoading] = useState(false);
  return (
    <Block title="Button" hint="primary · secondary · ghost · danger, sm / md, slots, loading, Swap">
      <Row label="md">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Delete</Button>
        <Button disabled>Disabled</Button>
      </Row>
      <Row label="sm">
        <Button size="sm" variant="primary">
          Primary
        </Button>
        <Button size="sm">Secondary</Button>
        <Button size="sm" variant="ghost">
          Ghost
        </Button>
        <Button size="sm" variant="danger">
          Delete
        </Button>
      </Row>
      <Row label="slots">
        <Button leading={<Icon icon={PrettifyIcon} size={14} />}>Pretty-print</Button>
        <Button leading={<Icon icon={DiffIcon} size={14} />} trailing={<Kbd keys={['mod', 'D']} />}>
          Compare
        </Button>
        <Button variant="ghost" trailing={<Badge tone="live">3</Badge>}>
          Overrides
        </Button>
        <Button variant="danger" leading={<Icon icon={DeleteIcon} size={14} />}>
          Delete override
        </Button>
      </Row>
      <Row label="loading">
        <Button loading={loading} leading={<Icon icon={ReloadIcon} size={14} />} onClick={() => setLoading(true)}>
          Reload page
        </Button>
        <Button variant="primary" loading={loading} onClick={() => setLoading(true)}>
          Apply
        </Button>
        <Button size="sm" loading={loading}>
          No leading
        </Button>
        <Switch size="sm" checked={loading} onCheckedChange={setLoading} label="loading" />
      </Row>
      <Row label="swap">
        <SaveDemo />
      </Row>
    </Block>
  );
}

function IconButtonsBlock() {
  const [preview, setPreview] = useState(true);
  const [rail, setRail] = useState('explorer');
  return (
    <Block title="IconButton" hint="hover for the tooltip (400 ms), then slide along the toolbar: instant">
      <Row label="toolbar">
        <div className="flex items-center gap-0.5 rounded-xl border border-line bg-canvas p-1">
          <IconButton icon={ReloadIcon} label="Reload page" shortcut={['mod', 'R']} />
          <IconButton icon={DevToolsIcon} label="Toggle DevTools" shortcut={['mod', 'alt', 'I']} />
          <IconButton icon={PrettifyIcon} label="Pretty-print" shortcut={['shift', 'alt', 'F']} />
          <IconButton icon={DiffIcon} label="Compare with original" />
          <IconButton icon={PreviewIcon} label="Page preview" active={preview} onClick={() => setPreview((v) => !v)} />
          <IconButton icon={DeleteIcon} label="Delete override" danger />
          <IconButton icon={SettingsIcon} label="Settings (disabled)" disabled />
        </div>
      </Row>
      <Row label="sizes">
        <IconButton size="sm" icon={CloseIcon} label="Close tab" />
        <IconButton size="md" icon={SearchIcon} label="Search" shortcut={['mod', 'K']} />
        <IconButton size="lg" icon={ExplorerIcon} label="Explorer" tooltipSide="right" />
      </Row>
      <Row label="rail">
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-canvas p-1.5">
          {[
            { id: 'explorer', icon: ExplorerIcon, label: 'Explorer', shortcut: ['mod', 'shift', 'E'] },
            {
              id: 'overrides',
              icon: OverridesIcon,
              label: 'Overrides',
              badge: <Badge tone="live" dot pulse className="h-auto border-0 bg-transparent px-0" />,
            },
            { id: 'search', icon: SearchIcon, label: 'Search', shortcut: ['mod', 'shift', 'F'] },
          ].map((item) => (
            <IconButton
              key={item.id}
              size="lg"
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              tooltipSide="right"
              active={rail === item.id}
              aria-pressed={undefined}
              aria-current={rail === item.id ? 'page' : undefined}
              badge={item.badge}
              onClick={() => setRail(item.id)}
            />
          ))}
        </div>
      </Row>
    </Block>
  );
}

function InputsBlock() {
  const [query, setQuery] = useState('');
  return (
    <Block title="Input" hint="adornments, sizes, mono, invalid, disabled">
      <div className="grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        <Input
          placeholder="Filter resources"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Icon icon={SearchIcon} size={14} />}
          trailing={
            query ? (
              <IconButton
                size="sm"
                icon={CloseIcon}
                label="Clear"
                noTooltip
                className="-mr-1 size-5"
                onClick={() => setQuery('')}
              />
            ) : (
              <Kbd keys={['mod', 'P']} />
            )
          }
        />
        <Input mono defaultValue="https://example.com/static/js/main.js" leading={<Icon icon={GlobeIcon} size={14} />} />
        <Input
          mono
          invalid
          defaultValue="*.example.[com"
          leading={<Icon icon={WarningIcon} size={14} className="text-danger" />}
          aria-label="Match rule"
        />
        <Input disabled placeholder="Disabled" />
        <Input size="sm" placeholder="Small input" leading={<Icon icon={SearchIcon} size={12} />} />
        <Input size="sm" mono placeholder="/api/*" trailing={<Badge>regex</Badge>} />
      </div>
    </Block>
  );
}

function BadgesBlock() {
  return (
    <Block title="Badge" hint="tones, dot, live pulse, glyph">
      <Row label="tones">
        <Badge>neutral</Badge>
        <Badge tone="live">live</Badge>
        <Badge tone="warning">upstream changed</Badge>
        <Badge tone="info">iframe</Badge>
        <Badge tone="accent">new</Badge>
        <Badge tone="danger">error</Badge>
      </Row>
      <Row label="dot">
        <Badge dot>idle</Badge>
        <Badge tone="live" dot pulse>
          Live
        </Badge>
        <Badge tone="warning" dot>
          Stale
        </Badge>
        <Badge tone="info" icon={LiveIcon}>
          Served
        </Badge>
        <Badge tone="accent">
          <Counter value={12} />
        </Badge>
      </Row>
    </Block>
  );
}

function CounterBlock() {
  const [count, setCount] = useState(7);
  return (
    <Block title="Counter" hint="only changed digits roll, in the direction of the change">
      <Row>
        <IconButton icon={MinusSignIcon} label="Decrement" onClick={() => setCount((c) => c - 1)} />
        <span className="w-16 text-center font-mono text-lg">
          <Counter value={count} />
        </span>
        <IconButton icon={Add01Icon} label="Increment" onClick={() => setCount((c) => c + 1)} />
        <Button size="sm" variant="ghost" onClick={() => setCount(Math.floor(Math.random() * 120))}>
          Random
        </Button>
        <Badge tone="live" dot>
          <Counter value={count} /> live
        </Badge>
        <span className="text-[13px] text-fg-muted">
          <Counter value={count} pad={3} /> requests
        </span>
      </Row>
    </Block>
  );
}

function SwitchBlock() {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const [c, setC] = useState(true);
  return (
    <Block title="Switch" hint="weighted thumb (press and hold to see it stretch)">
      <Row>
        <Switch checked={a} onCheckedChange={setA} tone="live" label="Override active" />
        <Switch checked={b} onCheckedChange={setB} label="Format on save" />
        <Switch checked={c} onCheckedChange={setC} size="sm" label="Small" />
        <Switch checked={false} onCheckedChange={() => {}} disabled label="Disabled" />
        <Switch checked onCheckedChange={() => {}} disabled tone="live" aria-label="Disabled on" />
      </Row>
    </Block>
  );
}

/**
 * A stand-in for the website's native view, registered while the pointer or
 * focus is inside, so its toolbar's tooltips (asked for `bottom`) flip above.
 */
function NativeViewDemo() {
  const view = useRef<HTMLDivElement>(null);
  const register = () => {
    const r = view.current?.getBoundingClientRect();
    setNativeViewRect(r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null);
  };
  const unregister = () => setNativeViewRect(null);
  useEffect(() => () => setNativeViewRect(null), []);
  return (
    <div
      className="flex w-72 flex-col overflow-hidden rounded-xl border border-line bg-surface"
      onPointerEnter={register}
      onPointerLeave={unregister}
      onFocusCapture={register}
      onBlurCapture={unregister}
    >
      <div className="flex h-10 items-center gap-1 border-b border-line px-2">
        <IconButton icon={ReloadIcon} label="Reload page" shortcut={['mod', 'R']} size="sm" tooltipSide="bottom" />
        <IconButton icon={DevToolsIcon} label="DevTools for the page" shortcut={['mod', 'shift', 'J']} size="sm" tooltipSide="bottom" />
      </div>
      <div ref={view} className="flex h-20 items-center justify-center bg-surface-raised px-4 text-center text-xs text-fg-subtle">
        native page view: tooltips asked for bottom flip above it
      </div>
    </div>
  );
}

function TooltipBlock() {
  return (
    <Block title="Tooltip" hint="sides, shortcut, flip at the window edge and off the native page view, pinned for review">
      <Row>
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <Tooltip key={side} content={`Tooltip on ${side}`} side={side}>
            <Button size="sm">{side}</Button>
          </Tooltip>
        ))}
        <Tooltip content="Save override" shortcut={['mod', 'S']}>
          <Button size="sm" variant="ghost">
            with shortcut
          </Button>
        </Tooltip>
        <Tooltip content="A longer description wraps at 320 px so it never runs across the whole window width.">
          <Button size="sm" variant="ghost">
            long text
          </Button>
        </Tooltip>
      </Row>
      <Row>
        <div className="h-8" />
        <Tooltip content="Pinned open" shortcut={['mod', 'K']} side="right" open>
          <span className="text-xs text-fg-muted">Pinned →</span>
        </Tooltip>
      </Row>
      <Row label="page view">
        <NativeViewDemo />
      </Row>
    </Block>
  );
}

function LoadingBlock() {
  return (
    <Block title="Spinner · Skeleton · Shimmer" hint="loading states">
      <Row label="spinner">
        <Spinner size={12} />
        <Spinner />
        <Spinner size={16} className="text-accent" />
        <Spinner size={20} className="text-live" label="Loading resources" />
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <Spinner size={12} /> Connecting to page…
        </span>
      </Row>
      <Row label="shimmer">
        <Shimmer className="text-[13px]">Pretty-printing…</Shimmer>
      </Row>
      <div className="flex max-w-md flex-col gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton lines={3} />
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
    </Block>
  );
}

/** Gallery section for the CONTROLS group of shared/ui. */
export function ControlsSection() {
  return (
    <div className="flex flex-col gap-4">
      <ButtonsBlock />
      <IconButtonsBlock />
      <InputsBlock />
      <BadgesBlock />
      <CounterBlock />
      <SwitchBlock />
      <TooltipBlock />
      <LoadingBlock />
    </div>
  );
}
