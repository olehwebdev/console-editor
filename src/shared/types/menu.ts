/** Menu actions the renderer implements (so they reach Monaco instead of the native text field). */
export type MenuCommand =
  | 'save'
  | 'format'
  | 'toggle-diff'
  | 'focus-url'
  | 'toggle-palette'
  | 'toggle-sidebar'
  | 'toggle-console'
  | 'undo'
  | 'redo'
  | 'select-all'
  | 'whats-new'
  | 'check-updates';
