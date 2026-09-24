/** Whether the app runs on macOS, where shortcuts read ⌘ ⇧ ⌥. */
export const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
