import type { KeyboardEvent } from 'react';
import { KEY } from '@/shared/config';
import { useActionEditor } from '../../model/useActionEditor';

/** Esc in one of the form's fields closes it without saving. */
export function closeOnEscape(event: KeyboardEvent): void {
  if (event.key !== KEY.escape) return;
  event.preventDefault();
  useActionEditor.getState().close();
}
