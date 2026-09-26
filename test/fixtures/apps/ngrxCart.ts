/**
 * A cart in Angular with an NgRx store for the store timeline's tests, bundled by
 * the test from the repo's own packages (compiled in the page: JIT, zoneless), with
 * NgRx's StoreDevtools, which reports each action to the Redux DevTools extension
 * when a page has it. The app dispatches in its click handler.
 */
import '@angular/compiler';
import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { createAction, createReducer, on, props, provideStore, Store } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

const added = createAction('[Cart] Add', props<{ sku: string }>());
const cartReducer = createReducer(
  { count: 0 },
  on(added, (state) => ({ count: state.count + 1 })),
);

class App {
  private readonly store = inject(Store);
  handleAdd() {
    this.store.dispatch(added({ sku: 'A1' }));
  }
}
Component({ selector: 'app-root', template: '<button id="add-A1" (click)="handleAdd()">Add</button>' })(App);

void bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection(), provideStore({ cart: cartReducer }), provideStoreDevtools({ maxAge: 25 })],
});
