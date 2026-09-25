import type { ReactNode } from 'react';
import { PanelResizer } from '@/shared/ui/panel-resizer';
import { CONSOLE_H, useLayout } from '../../model/layout';

const { resizeConsole, setConsoleDragging } = useLayout.getState();

/** The most of the editor column the console takes, however tall it was made in a bigger window. */
const MAX_HEIGHT = `${CONSOLE_H.maxRatio * 100}%`;

/** The console under the editor, at its remembered height; its top edge resizes it. */
export function ConsolePane({ children }: { children: ReactNode }) {
  const height = useLayout((s) => s.consoleHeight);
  return (
    <>
      <PanelResizer
        orientation="horizontal"
        aria-label="Resize console"
        value={height}
        onResize={resizeConsole}
        onResizeStart={() => setConsoleDragging(true)}
        onResizeEnd={() => setConsoleDragging(false)}
      />
      <div className="min-h-0 shrink-0 border-t border-line" style={{ height, maxHeight: MAX_HEIGHT }}>
        {children}
      </div>
    </>
  );
}
