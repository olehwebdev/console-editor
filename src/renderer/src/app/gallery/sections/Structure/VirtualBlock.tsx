import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useState } from 'react';
import { icons } from '@/shared/config';
import { Tree, TREE_ROW_HEIGHT, TreeRow } from '@/shared/ui/tree';
import { Block } from '../../Block';

const { FolderOpenIcon, JsIcon } = icons;

const VIRTUAL_COUNT = 5000;
/** Rows rendered past each edge of the viewport. */
const OVERSCAN = 12;
/** Rows per bundle: its own, then its chunks'. */
const BUNDLE_ROWS = 7;
/** Hex digits in a chunk's name (chunk.000a.js). */
const CHUNK_ID_DIGITS = 4;
const INITIAL_SELECTED = 3;

export function VirtualBlock() {
  const scroller = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(INITIAL_SELECTED);
  const virtual = useVirtualizer({
    count: VIRTUAL_COUNT,
    getScrollElement: () => scroller.current,
    estimateSize: () => TREE_ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  return (
    <Block title="Virtualized" hint={`${VIRTUAL_COUNT.toLocaleString()} translated rows; the pill measures the hovered one`}>
      <div ref={scroller} className="h-56 w-[300px] overflow-y-auto overflow-x-hidden rounded-lg border border-line bg-surface">
        <Tree label="Chunks" className="px-1.5" style={{ height: virtual.getTotalSize() }}>
          {virtual.getVirtualItems().map((item) => {
            const i = item.index;
            const depth = i % BUNDLE_ROWS === 0 ? 0 : 1;
            return (
              <div key={item.key} className="absolute inset-x-1.5 top-0" style={{ transform: `translateY(${item.start}px)`, height: TREE_ROW_HEIGHT }}>
                <TreeRow
                  depth={depth}
                  expanded={depth === 0 ? true : undefined}
                  selected={i === selected}
                  icon={depth === 0 ? FolderOpenIcon : JsIcon}
                  iconClassName={depth === 0 ? 'text-fg-subtle' : 'text-kind-js'}
                  label={depth === 0 ? `bundle-${i / BUNDLE_ROWS}` : `chunk.${i.toString(16).padStart(CHUNK_ID_DIGITS, '0')}.js`}
                  meta={depth === 0 ? BUNDLE_ROWS - 1 : undefined}
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
