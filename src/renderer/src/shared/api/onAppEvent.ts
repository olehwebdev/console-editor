import type { AppEvent } from '@common/types';
import { api } from './api';

export function onAppEvent(listener: (event: AppEvent) => void): () => void {
  return api.onEvent(listener);
}
