/**
 * The cart in Angular for the inspector's tests, bundled by the test from the
 * repo's own Angular packages (compiled in the page: JIT, zoneless). An item
 * takes inputs, keeps its quantity in a signal and handles a click, inside the
 * app that lists the items. Components are declared with `Component(...)(Class)`,
 * the form decorators compile to, so no compiler step is needed.
 */
import '@angular/compiler';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

class CartItem {
  sku = '';
  price = 0;
  qty = signal(1);
  label = 'item';
  handleAdd() {
    this.qty.update((qty) => qty + 1);
  }
}
Component({
  selector: 'app-cart-item',
  inputs: ['sku', 'price'],
  template: '<li class="cart-item">{{ sku }} {{ price * qty() }} EUR <button [id]="\'add-\' + sku" (click)="handleAdd()">Add</button></li>',
})(CartItem);

class App {
  items = [
    { sku: 'A1', price: 10 },
    { sku: 'B2', price: 5 },
  ];
}
Component({
  selector: 'app-root',
  imports: [CartItem],
  template: '<ul>@for (item of items; track item.sku) { <app-cart-item [sku]="item.sku" [price]="item.price" /> }</ul>',
})(App);

void bootstrapApplication(App, { providers: [provideZonelessChangeDetection()] });
