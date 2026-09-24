import { createWorkspace } from '../../model/workspaces';
import { focusAddressBar } from './focusAddressBar';

/** A new workspace starts on an empty page: its address is the first thing to give it. */
export const newWorkspace = () =>
  void createWorkspace().then((shown) => {
    if (shown) focusAddressBar();
  });
