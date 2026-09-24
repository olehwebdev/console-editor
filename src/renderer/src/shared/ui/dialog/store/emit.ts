import { confirmState } from './confirmState';

export function emit() {
  for (const listener of confirmState.listeners) listener();
}
