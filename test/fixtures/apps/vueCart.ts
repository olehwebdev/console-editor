/**
 * The same cart in Vue 3, for the inspector's integration test: an item injects
 * the currency, keeps state and handles a click, inside a list (with state the
 * inspector can set) inside the app that provides the currency.
 */
import { computed, createApp, defineComponent, h, inject, provide, ref, type PropType } from 'vue';

const CartItem = defineComponent({
  name: 'CartItem',
  props: { sku: { type: String, required: true }, price: { type: Number, required: true } },
  setup(props) {
    const currency = inject('currency', 'USD');
    const qty = ref(1);
    function handleAdd() {
      qty.value += 1;
    }
    return () => h('li', { class: 'cart-item' }, [`${props.sku} ${props.price * qty.value} ${currency} `, h('button', { id: `add-${props.sku}`, onClick: handleAdd }, 'Add')]);
  },
});

// Its state is where the inspector can set it: a key of data, and a ref in setupState (a render option, not a render function from setup).
const CartList = defineComponent({
  name: 'CartList',
  props: { items: { type: Array as PropType<Array<{ sku: string; price: number }>>, required: true } },
  data: () => ({ title: 'Cart' }),
  setup() {
    const open = ref(true);
    const count = computed(() => 2);
    return { open, count };
  },
  render() {
    return h('ul', { id: 'list', 'data-title': this.title, 'data-open': String(this.open) }, this.items.map((item) => h(CartItem, { key: item.sku, sku: item.sku, price: item.price })));
  },
});

const App = defineComponent({
  name: 'App',
  setup() {
    provide('currency', 'EUR');
    return () => h(CartList, { items: [{ sku: 'A1', price: 10 }, { sku: 'B2', price: 5 }] });
  },
});

createApp(App).mount('#root');
