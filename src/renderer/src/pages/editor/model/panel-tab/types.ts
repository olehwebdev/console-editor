/** What the panel under the editor shows. */
export type PanelTab = 'console' | 'renders';

export interface PanelTabStore {
  tab: PanelTab;
  show(tab: PanelTab): void;
}
