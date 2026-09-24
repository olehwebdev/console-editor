export { useTabStore, selectActiveTab, selectActivePage, selectTabById, selectHasDirtyTabs, type TabMeta, type PageTab, type DiffMode } from './model/store';
export {
  newTabId,
  onTabEdited,
  createTabModel,
  getTabModel,
  getTabBase,
  setTabBase,
  markTabSaved,
  replaceTabText,
  disposeTabModel,
} from './model/models';
