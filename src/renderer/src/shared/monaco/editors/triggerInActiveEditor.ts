import { editorState } from './editorState';

/** The `source` Monaco hands the handler: the call comes from an app command, not the keyboard or mouse. */
const TRIGGER_SOURCE = 'command';

export function triggerInActiveEditor(handlerId: string): void {
  editorState.active?.trigger(TRIGGER_SOURCE, handlerId, null);
}
