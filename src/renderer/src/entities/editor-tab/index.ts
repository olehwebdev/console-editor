export {
  useTabStore,
  selectActiveTab,
  selectActivePage,
  selectActiveSource,
  selectTabById,
  selectHasDirtyTabs,
  type TabMeta,
  type SourceTab,
  type PageTab,
  type DiffMode,
} from './model/store';
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
