import type { ResourceKind } from '../../shared/types';
import { fileName } from './dom';
import { languageFor, monaco } from './monaco';

export interface Tab {
  id: number;
  url: string;
  kind: ResourceKind;
  /** Set once the tab is saved as an override. */
  overrideId?: string;
  /** Hash of the upstream file this tab was forked from (for new overrides). */
  originalHash: string | null;
  model: monaco.editor.ITextModel;
  /** The text editing started from; the diff view compares against it. */
  base: string;
  savedVersionId: number;
  viewState: monaco.editor.ICodeEditorViewState | null;
  saving?: Promise<void>;
}

export interface OpenTabInput {
  url: string;
  kind: ResourceKind;
  content: string;
  base: string;
  originalHash: string | null;
  overrideId?: string;
}

export type DiffMode = 'off' | 'base' | 'upstream';

const EDITOR_OPTIONS: monaco.editor.IEditorOptions & monaco.editor.IGlobalEditorOptions = {
  automaticLayout: true,
  fontSize: 13,
  tabSize: 2,
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  fixedOverflowWidgets: true,
};

/** Hosts the Monaco editor, the diff editor and the open tabs' models. */
export class EditorPane {
  readonly tabs: Tab[] = [];
  active: Tab | null = null;
  diffMode: DiffMode = 'off';
  /** Called whenever tabs, the active tab or dirty state change. */
  onChange: () => void = () => undefined;

  private readonly editor: monaco.editor.IStandaloneCodeEditor;
  private diffEditor: monaco.editor.IStandaloneDiffEditor | null = null;
  private diffOriginal: monaco.editor.ITextModel | null = null;
  private nextId = 1;
  /** Actions to install on the diff editor once it is created. */
  private readonly pendingActions: monaco.editor.IActionDescriptor[] = [];

  constructor(
    private readonly editorHost: HTMLElement,
    private readonly diffHost: HTMLElement,
  ) {
    monaco.editor.setTheme('vs-dark');
    this.editor = monaco.editor.create(editorHost, { ...EDITOR_OPTIONS, model: null });
  }

  /** Registers an editor action (with keybinding) on both the normal and the diff editor. */
  addAction(action: monaco.editor.IActionDescriptor): void {
    this.editor.addAction(action);
    this.pendingActions.push(action);
    this.diffEditor?.getModifiedEditor().addAction(action);
  }

  open(input: OpenTabInput): Tab {
    const id = this.nextId++;
    const uri = monaco.Uri.from({ scheme: 'inmemory', authority: 'tab', path: `/${id}/${fileName(input.url)}` });
    const model = monaco.editor.createModel(input.content, languageFor(input.kind), uri);
    const tab: Tab = {
      id,
      url: input.url,
      kind: input.kind,
      overrideId: input.overrideId,
      originalHash: input.originalHash,
      model,
      base: input.base,
      savedVersionId: model.getAlternativeVersionId(),
      viewState: null,
    };
    model.onDidChangeContent(() => this.onChange());
    this.tabs.push(tab);
    this.activate(tab);
    return tab;
  }

  activate(tab: Tab): void {
    if (this.active === tab) return;
    this.hideDiff();
    if (this.active) this.active.viewState = this.editor.saveViewState();
    this.active = tab;
    this.editor.setModel(tab.model);
    if (tab.viewState) this.editor.restoreViewState(tab.viewState);
    this.editor.focus();
    this.onChange();
  }

  close(tab: Tab): void {
    const index = this.tabs.indexOf(tab);
    if (index === -1) return;
    if (this.active === tab) {
      this.hideDiff();
      const next = this.tabs[index + 1] ?? this.tabs[index - 1] ?? null;
      this.active = null;
      this.editor.setModel(null);
      if (next) this.activate(next);
    }
    this.tabs.splice(index, 1);
    tab.model.dispose();
    this.onChange();
  }

  isDirty(tab: Tab): boolean {
    return tab.model.getAlternativeVersionId() !== tab.savedVersionId;
  }

  markSaved(tab: Tab): void {
    tab.savedVersionId = tab.model.getAlternativeVersionId();
    this.onChange();
  }

  /** Replaces the whole text as one undoable edit. */
  replaceText(tab: Tab, text: string): void {
    tab.model.pushStackElement();
    tab.model.pushEditOperations([], [{ range: tab.model.getFullModelRange(), text }], () => null);
    tab.model.pushStackElement();
  }

  showDiff(mode: Exclude<DiffMode, 'off'>, originalText?: string): void {
    const tab = this.active;
    if (!tab) return;
    this.disposeDiffOriginal();
    this.diffOriginal = monaco.editor.createModel(mode === 'base' ? tab.base : (originalText ?? ''), languageFor(tab.kind));
    if (!this.diffEditor) {
      this.diffEditor = monaco.editor.createDiffEditor(this.diffHost, {
        ...EDITOR_OPTIONS,
        originalEditable: false,
        renderSideBySide: true,
        ignoreTrimWhitespace: false,
      });
      for (const action of this.pendingActions) this.diffEditor.getModifiedEditor().addAction(action);
    }
    this.diffEditor.setModel({ original: this.diffOriginal, modified: tab.model });
    this.editorHost.hidden = true;
    this.diffHost.hidden = false;
    this.diffMode = mode;
    this.diffEditor.getModifiedEditor().focus();
    this.onChange();
  }

  hideDiff(): void {
    if (this.diffMode === 'off') return;
    this.diffEditor?.setModel(null);
    this.disposeDiffOriginal();
    this.diffHost.hidden = true;
    this.editorHost.hidden = false;
    this.diffMode = 'off';
    this.editor.focus();
    this.onChange();
  }

  private disposeDiffOriginal(): void {
    this.diffOriginal?.dispose();
    this.diffOriginal = null;
  }

  /** The editor the user is typing in (the modified side when diffing). */
  current(): monaco.editor.ICodeEditor {
    return this.diffMode !== 'off' && this.diffEditor ? this.diffEditor.getModifiedEditor() : this.editor;
  }

  hasTextFocus(): boolean {
    return this.current().hasTextFocus();
  }

  trigger(handlerId: string): void {
    this.current().trigger('menu', handlerId, null);
  }
}
