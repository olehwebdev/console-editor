export { useTabStore, selectActiveTab, selectTabById, selectHasDirtyTabs, type TabMeta, type DiffMode } from './model/store';
export {
  newTabId,
  createTabModel,
  getTabModel,
  getTabBase,
  setTabBase,
  markTabSaved,
  replaceTabText,
  disposeTabModel,
} from './model/models';
