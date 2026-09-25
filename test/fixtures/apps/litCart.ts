/**
 * The cart as web components in Lit for the inspector's tests: an item has a
 * reactive property (its SKU) and a state (its quantity), renders into its
 * shadow root and handles a click, inside a list that is a custom element too.
 */
import { html, LitElement } from 'lit';

class CartItem extends LitElement {
  static properties = { sku: { type: String }, price: { type: Number }, qty: { state: true } };
  declare sku: string;
  declare price: number;
  declare qty: number;

  constructor() {
    super();
    this.sku = '';
    this.price = 0;
    this.qty = 1;
  }

  handleAdd() {
    this.qty += 1;
  }

  render() {
    return html`<li class="cart-item">${this.sku} ${this.price * this.qty} EUR <button id="add-${this.sku}" @click=${this.handleAdd}>Add</button></li>`;
  }
}
customElements.define('cart-item', CartItem);

class CartList extends LitElement {
  render() {
    return html`<ul><cart-item sku="A1" price="10"></cart-item><cart-item sku="B2" price="5"></cart-item></ul>`;
  }
}
customElements.define('cart-list', CartList);

document.getElementById('root')!.append(document.createElement('cart-list'));
