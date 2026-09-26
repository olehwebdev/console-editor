/**
 * A large React app for the inspector's performance checks: a table of `ROWS` memoized rows, each with
 * three cells holding a badge (about 14,000 components), a button that re-renders every row, one that
 * re-renders a single row, and a chain of components `DEPTH` deep.
 */
import { createElement as h, memo, useState } from 'react';
import { createRoot } from 'react-dom/client';

const ROWS = 2000;
const DEPTH = 1500;

function Badge({ n }: { n: number }) {
  return h('b', null, n);
}

function Cell({ value }: { value: number }) {
  const [open] = useState(false);
  return h('td', { className: open ? 'open' : undefined }, value, h(Badge, { n: value % 7 }));
}

const Row = memo(function Row({ i, tick }: { i: number; tick: number }) {
  return h('tr', { id: `row-${i}` }, h(Cell, { value: i }), h(Cell, { value: tick }), h(Cell, { value: i + tick }));
});

function Table({ tick, one }: { tick: number; one: number }) {
  return h('table', null, h('tbody', null, Array.from({ length: ROWS }, (_, i) => h(Row, { key: i, i, tick: i === 0 ? one + tick : tick }))));
}

function Nest({ depth }: { depth: number }): ReturnType<typeof h> {
  return depth ? h(Nest, { depth: depth - 1 }) : h('span', { id: 'deep' }, 'deep');
}

function App() {
  const [tick, setTick] = useState(0);
  const [one, setOne] = useState(0);
  return h(
    'div',
    null,
    h('button', { id: 'all', onClick: () => setTick((t) => t + 1) }, 'all'),
    h('button', { id: 'one', onClick: () => setOne((o) => o + 1) }, 'one'),
    h(Nest, { depth: DEPTH }),
    h(Table, { tick, one }),
  );
}

createRoot(document.getElementById('root')!).render(h(App));
