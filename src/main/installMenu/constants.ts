import type { WebContents } from 'electron';
import { REPO_URL } from '../appInfo';
import type { EditCommand } from './types';

/** Where Help › Report an Issue leads. */
export const ISSUES_URL = `${REPO_URL}/issues`;

/** What each edit command does to web contents other than the editor's UI. */
export const EDIT_ACTIONS: Record<EditCommand, (wc: WebContents) => void> = {
  undo: (wc) => wc.undo(),
  redo: (wc) => wc.redo(),
  'select-all': (wc) => wc.selectAll(),
};
