/**
 * A cart in Vue with Pinia, and its settings in Vuex, for the store timeline's
 * tests, bundled by the test from the repo's own packages: an item calls the
 * cart store's action, a reset button changes its state directly, a hang button
 * starts an action that never settles, and a currency button commits a Vuex mutation.
 */
import { createPinia, defineStore } from 'pinia';
import { createApp, h } from 'vue';
import { createStore } from 'vuex';

const useCart = defineStore('cart', {
  state: () => ({ count: 0, skus: [] as string[] }),
  actions: {
    add(sku: string) {
      this.count += 1;
      this.skus.push(sku);
    },
    // An action waiting on something that never answers.
    hang() {
      return new Promise<void>(() => undefined);
    },
  },
});

const settings = createStore({
  state: () => ({ currency: 'EUR' }),
  mutations: {
    setCurrency(state: { currency: string }, currency: string) {
      state.currency = currency;
    },
  },
});

const CartItem = {
  props: { sku: { type: String, required: true } },
  setup(props: { sku: string }) {
    // oxlint-disable-next-line react/rules-of-hooks -- Pinia's store in Vue's setup(), not a React hook
    const cart = useCart();
    function handleAdd() {
      cart.add(props.sku);
    }
    function handleReset() {
      cart.count = 0;
    }
    function handleHang() {
      void cart.hang();
    }
    function handleCurrency() {
      settings.commit('setCurrency', 'USD');
    }
    return () =>
      h('li', null, [
        `${props.sku} ${cart.count} `,
        h('button', { id: `add-${props.sku}`, onClick: handleAdd }, 'Add'),
        h('button', { id: 'reset', onClick: handleReset }, 'Reset'),
        h('button', { id: 'hang', onClick: handleHang }, 'Hang'),
        h('button', { id: 'usd', onClick: handleCurrency }, 'USD'),
      ]);
  },
};

createApp({ render: () => h('ul', null, [h(CartItem, { sku: 'A1' })]) })
  .use(createPinia())
  .use(settings)
  .mount('#root');
