import { useRef, useState } from 'react';
import { PanelResizer } from '@/shared/ui/panel-resizer';
import { Block } from '../../Block';
import { clamp } from './clamp';

/** Each panel's size in px: where it starts (and resets to), and its limits. */
const SIDEBAR = { initial: 180, min: 120, max: 320 };
const PREVIEW = { initial: 200, min: 120, max: 320 };
const BOTTOM = { initial: 72, min: 32, max: 160 };

export function ResizerBlock() {
  const [sidebar, setSidebar] = useState(SIDEBAR.initial);
  const [preview, setPreview] = useState(PREVIEW.initial);
  const [bottom, setBottom] = useState(BOTTOM.initial);
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
            min={SIDEBAR.min}
            max={SIDEBAR.max}
            onResizeStart={() => {
              drag.current = { start: sidebar };
              setResizing(true);
            }}
            onResize={(delta, total) => {
              const from = drag.current;
              setSidebar((w) => clamp(from ? from.start + total : w + delta, SIDEBAR.min, SIDEBAR.max));
            }}
            onResizeEnd={() => {
              drag.current = null;
              setResizing(false);
            }}
            onReset={() => setSidebar(SIDEBAR.initial)}
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
            min={BOTTOM.min}
            max={BOTTOM.max}
            onResize={(delta) => setBottom((h) => clamp(h - delta, BOTTOM.min, BOTTOM.max))}
            onReset={() => setBottom(BOTTOM.initial)}
          />
          <div className="shrink-0 bg-surface p-3" style={{ height: bottom }}>
            <span className="label-caps">Panel</span>
            <p className="mt-1 tabular-nums">{bottom}px</p>
          </div>
        </div>
        <PanelResizer
          aria-label="Resize preview"
          value={preview}
          min={PREVIEW.min}
          max={PREVIEW.max}
          onResize={(delta) => setPreview((w) => clamp(w - delta, PREVIEW.min, PREVIEW.max))}
          onReset={() => setPreview(PREVIEW.initial)}
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
