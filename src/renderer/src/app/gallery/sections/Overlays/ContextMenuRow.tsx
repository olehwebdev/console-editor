import { ContextMenu, type MenuItem } from '@/shared/ui/menu';
import { Row } from './Row';

/** The file actions as a context menu over a focusable area. */
export function ContextMenuRow({ fileMenu }: { fileMenu: MenuItem[] }) {
  return (
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
  );
}
