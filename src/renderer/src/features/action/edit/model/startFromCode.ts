import { MAX_ACTION_NAME } from '@common/constants';
import type { ActionInput, ConsoleFrame } from '@common/types';
import { frameKey } from '@/entities/frame';
import { useActionEditor } from './useActionEditor';

/**
 * Opens the form on a new action from code you ran in `frame`: it runs there,
 * and is named after the code's first line until you name it.
 */
export function startFromCode(code: string, frame: ConsoleFrame | undefined): void {
  const start: Partial<ActionInput> = { code, name: (code.trim().split('\n', 1)[0] ?? '').slice(0, MAX_ACTION_NAME) };
  if (frame) Object.assign(start, { target: frameKey(frame), targetName: frame.parentId ? frame.name : '' });
  useActionEditor.getState().startNew(start);
}
