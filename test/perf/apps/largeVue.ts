/**
 * A large Vue 3 app for the inspector's performance checks: a table of `ROWS` rows, each with three cells
 * holding a badge (about 14,000 component instances, some 40,000 vnodes), a button that re-renders every
 * row, and a chain of components `DEPTH` deep (Vue itself runs out of stack near 1,500).
 */
import { createApp, defineComponent, h, ref, type PropType } from 'vue';

const ROWS = 2000;
const DEPTH = 300;

const Badge = defineComponent({ name: 'Badge', props: { n: { type: Number, required: true } }, setup: (props) => () => h('b', null, props.n) });
const Cell = defineComponent({
  name: 'Cell',
  props: { value: { type: Number, required: true } },
  setup: (props) => () => h('td', null, [props.value, h(Badge, { n: props.value % 7 })]),
});
const Row = defineComponent({
  name: 'Row',
  props: { i: { type: Number, required: true }, tick: { type: Number, required: true } },
  setup: (props) => () => h('tr', { id: `row-${props.i}` }, [h(Cell, { value: props.i }), h(Cell, { value: props.tick }), h(Cell, { value: props.i + props.tick })]),
});
const Nest: ReturnType<typeof defineComponent> = defineComponent({
  name: 'Nest',
  props: { depth: { type: Number as PropType<number>, required: true } },
  setup: (props) => () => (props.depth ? h(Nest, { depth: props.depth - 1 }) : h('span', { id: 'deep' }, 'deep')),
});

const App = defineComponent({
  name: 'App',
  setup() {
    const tick = ref(0);
    return () =>
      h('div', null, [
        h('button', { id: 'all', onClick: () => (tick.value += 1) }, 'all'),
        h(Nest, { depth: DEPTH }),
        h('table', null, [h('tbody', null, Array.from({ length: ROWS }, (_, i) => h(Row, { key: i, i, tick: tick.value })))]),
      ]);
  },
});

createApp(App).mount('#root');
