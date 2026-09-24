import { TAB_ID } from './constants';

export function assertTabId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !TAB_ID.test(id)) throw new Error('Invalid tab id');
}
