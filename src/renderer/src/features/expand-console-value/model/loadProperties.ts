import type { ConsoleProperty } from '@common/types';
import { api } from '@/shared/api';

/** One level of a logged value's properties, read from the page on demand. */
export function loadProperties(handle: number): Promise<ConsoleProperty[]> {
  return api.getConsoleProperties(handle);
}
