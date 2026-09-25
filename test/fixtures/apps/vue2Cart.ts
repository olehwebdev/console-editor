/**
 * The cart in Vue 2.7 for the inspector's tests (the runtime-only build, render
 * functions): an item takes props, keeps its quantity in data and handles a
 * click, inside a list inside the app, which provides the currency.
 */
import Vue from 'vue2';

type Item = { sku: string; price: number };

const CartItem = Vue.extend({
  name: 'CartItem',
  props: { sku: String, price: Number },
  inject: ['currency'],
  data: () => ({ qty: 1 }),
  methods: {
    handleAdd() {
      this.qty += 1;
    },
  },
  render(h) {
    const { currency } = this as unknown as { currency: string };
    return h('li', { class: 'cart-item' }, [`${this.sku} ${this.price * this.qty} ${currency} `, h('button', { attrs: { id: `add-${this.sku}` }, on: { click: this.handleAdd } }, 'Add')]);
  },
});

const CartList = Vue.extend({
  name: 'CartList',
  props: { items: { type: Array as () => Item[], required: true } },
  render(h) {
    return h('ul', this.items.map((item) => h(CartItem, { key: item.sku, props: { sku: item.sku, price: item.price } })));
  },
});

new Vue({
  name: 'App',
  provide: { currency: 'EUR' },
  render: (h) => h(CartList, { props: { items: [{ sku: 'A1', price: 10 }, { sku: 'B2', price: 5 }] } }),
}).$mount('#root');
