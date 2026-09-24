import { getTabModel } from '@/entities/editor-tab';
import { doSave } from './doSave';
import { jobs } from './jobs';

export function startSave(tabId: string): Promise<void> {
  // doSave snapshots the model before its first await, so this is the version it sends.
  const version = getTabModel(tabId)?.getAlternativeVersionId();
  const task = doSave(tabId).finally(() => jobs.delete(tabId));
  jobs.set(tabId, { task, version });
  return task;
}
