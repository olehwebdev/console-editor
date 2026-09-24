import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { SPRING_LAYOUT } from '@/shared/lib';
import { PanelResizer } from '@/shared/ui/panel-resizer';
import { selectSidebarWidth, useLayout } from '../../model/layout';
import { endResize } from './endResize';
import { startResize } from './startResize';

const { resizeSidebar } = useLayout.getState();

/** The sidebar at its fitted width. Only this re-renders while it is dragged; `children` are passed through. */
export function SidebarPane({ resizing, children }: { resizing: boolean; children: ReactNode }) {
  const width = useLayout(selectSidebarWidth);
  return (
    <motion.aside
      className="relative shrink-0 overflow-hidden border-r border-line bg-surface"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={resizing ? { duration: 0 } : SPRING_LAYOUT}
    >
      <div style={{ width }} className="h-full">
        {children}
      </div>
      <PanelResizer
        className="absolute inset-y-0 -right-1"
        aria-label="Resize sidebar"
        onResize={resizeSidebar}
        onResizeStart={startResize}
        onResizeEnd={endResize}
      />
    </motion.aside>
  );
}
