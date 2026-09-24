/** Listeners signed up with `onTabEdited`, called after every edit of any tab's text. */
export const editListeners = new Set<(tabId: string) => void>();
