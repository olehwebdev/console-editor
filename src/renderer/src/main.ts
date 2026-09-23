import './styles.css';
import { compileMatcher, suggestHashGlob, validateMatcher } from '../../shared/matcher';
import {
  DEFAULT_SETTINGS,
  type AppEvent,
  type MatchType,
  type MenuCommand,
  type OverrideMeta,
  type PageState,
  type ResourceEntry,
  type ResourceKind,
  type Settings,
  type UrlMatcher,
} from '../../shared/types';
import { fileName, h, KIND_LABEL } from './dom';
import { EditorPane, type Tab } from './editorPane';
import { formatCode, looksMinified } from './format';
import { icon } from './icons';
import { monaco } from './monaco';
import { renderSidebar } from './sidebar';

const api = window.consoleEditor;

const SETTING_LABELS: Record<keyof Settings, [label: string, help: string]> = {
  autoReloadOnSave: ['Reload page on save', 'Reload the page after saving, enabling or deleting an override.'],
  autoFormatMinified: ['Pretty-print minified files', 'Format minified JS/CSS/HTML when you open them.'],
  stripIntegrity: ['Strip SRI integrity attributes', 'Otherwise the browser refuses edited files that the page loads with integrity="…".'],
  stripSourceMaps: ['Strip source maps from overrides', 'Edited files no longer line up with their source maps.'],
  disableCache: ['Disable HTTP cache', 'Every load goes to the network, so overrides always apply.'],
  bypassServiceWorker: ['Bypass service workers', 'Service workers can answer from their cache and skip overrides.'],
  bypassCSP: ['Bypass Content-Security-Policy', 'Allow eval/inline code in patches on sites with a strict CSP.'],
};

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing from index.html`);
  return el as T;
}

/** IPC errors arrive as "Error invoking remote method 'x': Error: message". */
function errorMessage(err: unknown): string {
  return String((err as Error)?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

function guessKind(url: string): ResourceKind {
  const path = url.split(/[?#]/)[0];
  if (/\.css$/i.test(path)) return 'Stylesheet';
  if (/\.m?js$/i.test(path)) return 'Script';
  return 'Document';
}

function kindBadge(kind: ResourceKind) {
  return h('span', { class: `kind kind-${kind.toLowerCase()}` }, KIND_LABEL[kind]);
}

function button(label: string, onClick: () => void, attrs: Record<string, unknown> = {}) {
  return h('button', { class: 'button', onClick, ...attrs }, label);
}

class App {
  private readonly el = {
    url: byId<HTMLInputElement>('url'),
    back: byId<HTMLButtonElement>('btn-back'),
    forward: byId<HTMLButtonElement>('btn-forward'),
    reload: byId<HTMLButtonElement>('btn-reload'),
    devtools: byId<HTMLButtonElement>('btn-devtools'),
    filter: byId<HTMLInputElement>('filter'),
    sidebarList: byId('sidebar-list'),
    settingsButton: byId<HTMLButtonElement>('btn-settings'),
    folderButton: byId<HTMLButtonElement>('btn-folder'),
    settingsPanel: byId('settings-panel'),
    tabs: byId('tabs'),
    fileHeader: byId('file-header'),
    empty: byId('empty-state'),
    pageHost: byId('page-host'),
    pagePlaceholder: byId('page-placeholder'),
    splitter: byId('splitter'),
    statusPage: byId('status-page'),
    statusMessage: byId('status-message'),
    statusCounts: byId('status-counts'),
  };

  private readonly editor = new EditorPane(byId('editor-host'), byId('diff-host'));
  private readonly resources = new Map<string, ResourceEntry>();
  private readonly overrides = new Map<string, OverrideMeta>();
  private readonly hits = new Map<string, number>();
  private readonly upstreamChanged = new Set<string>();
  private readonly opening = new Set<string>();
  private settings: Settings = { ...DEFAULT_SETTINGS };
  private page: PageState = { url: '', title: '', loading: false, canGoBack: false, canGoForward: false };
  private filter = '';
  private pending = { sidebar: false, editor: false, frame: 0 };
  private headerKey = '';
  private pageHidden = false;
  private statusTimer = 0;

  async start(): Promise<void> {
    this.editor.onChange = () => this.schedule('editor');
    this.editor.addAction({
      id: 'console-editor.save',
      label: 'Save Override',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => void this.save(),
    });
    this.editor.addAction({
      id: 'console-editor.format',
      label: 'Pretty-print Document',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: () => void this.format(),
    });

    this.bindChrome();
    api.onEvent((event) => this.onEvent(event));

    const [settings, overrides, resources, page] = await Promise.all([
      api.getSettings(),
      api.listOverrides(),
      api.listResources(),
      api.getPageState(),
    ]);
    this.settings = settings;
    this.setOverrides(overrides);
    for (const r of resources) this.resources.set(r.url, r);
    this.setPage(page);
    this.observePageBounds();
    this.renderSettings();
    this.schedule('sidebar', 'editor');
    if (!page.url) this.el.url.focus();
    document.body.dataset.ready = 'true';
  }

  // ---------------------------------------------------------------- events

  private onEvent(event: AppEvent): void {
    switch (event.type) {
      case 'navigated':
        this.resources.clear();
        break;
      case 'resource':
        this.resources.set(event.resource.url, event.resource);
        break;
      case 'override-served':
        this.hits.set(event.overrideId, (this.hits.get(event.overrideId) ?? 0) + 1);
        break;
      case 'upstream-changed':
        if (!this.upstreamChanged.has(event.overrideId)) {
          this.upstreamChanged.add(event.overrideId);
          this.status(`The live ${fileName(event.url)} changed since you created the override`, 'warn');
        }
        break;
      case 'error':
        this.status(event.message, 'error');
        break;
      case 'page-state':
        this.setPage(event.state);
        break;
      case 'overrides-changed':
        this.setOverrides(event.overrides);
        break;
      case 'command':
        this.runCommand(event.command);
        return;
    }
    this.schedule('sidebar', 'editor');
  }

  private runCommand(command: MenuCommand): void {
    switch (command) {
      case 'save':
        void this.save();
        break;
      case 'format':
        void this.format();
        break;
      case 'toggle-diff':
        this.toggleDiff();
        break;
      case 'focus-url':
        this.el.url.focus();
        this.el.url.select();
        break;
      case 'undo':
      case 'redo':
        if (this.editor.hasTextFocus()) this.editor.trigger(command);
        else document.execCommand(command);
        break;
      case 'select-all':
        if (this.editor.hasTextFocus()) this.editor.trigger('editor.action.selectAll');
        else document.execCommand('selectAll');
        break;
    }
  }

  private setOverrides(list: OverrideMeta[]): void {
    this.overrides.clear();
    for (const o of list) this.overrides.set(o.id, o);
    // Tabs whose override was deleted elsewhere become plain (unsaved) tabs again.
    for (const tab of this.editor.tabs) {
      if (tab.overrideId && !this.overrides.has(tab.overrideId)) tab.overrideId = undefined;
    }
  }

  private setPage(state: PageState): void {
    const hadUrl = !!this.page.url;
    this.page = state;
    if (document.activeElement !== this.el.url) this.el.url.value = state.url;
    this.el.back.disabled = !state.canGoBack;
    this.el.forward.disabled = !state.canGoForward;
    this.el.pagePlaceholder.hidden = !!state.url;
    if (!hadUrl && state.url) this.sendPageBounds();
    this.renderStatus();
  }

  // ---------------------------------------------------------------- actions

  private async openResource(url: string): Promise<void> {
    const entry = this.resources.get(url);
    const overrideId = entry?.overrideId ?? this.findOverrideFor(url)?.id;
    if (overrideId && this.overrides.has(overrideId)) return this.openOverride(overrideId);

    const existing = this.editor.tabs.find((t) => !t.overrideId && t.url === url);
    if (existing) return this.editor.activate(existing);
    if (this.opening.has(url)) return;

    this.opening.add(url);
    this.status(`Loading ${fileName(url)}…`);
    try {
      const res = await api.getResourceContent(url);
      const kind = entry?.kind ?? guessKind(url);
      let text = res.content;
      if (this.settings.autoFormatMinified && looksMinified(text)) {
        this.status(`Pretty-printing ${fileName(url)}…`);
        text = await formatCode(text, kind).catch(() => text);
      }
      this.editor.open({ url, kind, content: text, base: text, originalHash: res.hash });
      this.status(`Opened ${fileName(url)}. Edit it and press Ctrl/Cmd+S to override the live file.`);
    } catch (err) {
      this.status(`Could not load ${url}: ${errorMessage(err)}`, 'error');
    } finally {
      this.opening.delete(url);
    }
  }

  private async openOverride(id: string): Promise<void> {
    const existing = this.editor.tabs.find((t) => t.overrideId === id);
    if (existing) return this.editor.activate(existing);
    try {
      const o = await api.getOverride(id);
      this.editor.open({ url: o.sourceUrl, kind: o.kind, content: o.content, base: o.base, originalHash: o.originalHash, overrideId: o.id });
    } catch (err) {
      this.status(`Could not open override: ${errorMessage(err)}`, 'error');
    }
  }

  /** The override that applies to a URL (enabled ones first). */
  private findOverrideFor(url: string): OverrideMeta | undefined {
    const candidates = [...this.overrides.values()].filter((o) => compileMatcher(o.match)(url));
    return candidates.find((o) => o.enabled) ?? candidates[0];
  }

  private save(tab: Tab | null = this.editor.active): Promise<void> {
    if (!tab) return Promise.resolve();
    if (tab.saving) return tab.saving;
    tab.saving = (async () => {
      const content = tab.model.getValue();
      const version = tab.model.getAlternativeVersionId();
      try {
        if (tab.overrideId) {
          if (!this.editor.isDirty(tab)) return;
          await api.updateOverride(tab.overrideId, { content });
        } else {
          const created = await api.createOverride({
            kind: tab.kind,
            sourceUrl: tab.url,
            content,
            base: tab.base,
            originalHash: tab.originalHash,
          });
          tab.overrideId = created.id;
          this.overrides.set(created.id, created);
        }
        tab.savedVersionId = version;
        this.editor.onChange();
        this.status(`Saved ${fileName(tab.url)}${this.settings.autoReloadOnSave ? ', reloading the page' : ''}`);
        if (this.settings.autoReloadOnSave) await api.reload();
      } catch (err) {
        this.status(`Save failed: ${errorMessage(err)}`, 'error');
      }
    })().finally(() => {
      tab.saving = undefined;
      this.schedule('sidebar', 'editor');
    });
    return tab.saving;
  }

  private async format(): Promise<void> {
    const tab = this.editor.active;
    if (!tab) return;
    this.status('Pretty-printing…');
    try {
      this.editor.replaceText(tab, await formatCode(tab.model.getValue(), tab.kind));
      this.status('Formatted (Ctrl/Cmd+Z to undo)');
    } catch (err) {
      this.status(`Format failed: ${errorMessage(err)}`, 'error');
    }
  }

  private toggleDiff(): void {
    if (!this.editor.active) return;
    if (this.editor.diffMode !== 'off') this.editor.hideDiff();
    else this.editor.showDiff('base');
  }

  private async compareWithLive(): Promise<void> {
    const tab = this.editor.active;
    if (!tab) return;
    this.status(`Fetching the live ${fileName(tab.url)}…`);
    try {
      const res = await api.getResourceContent(tab.url);
      const text = looksMinified(res.content) ? await formatCode(res.content, tab.kind).catch(() => res.content) : res.content;
      this.editor.showDiff('upstream', text);
      this.status('Left: the live file now. Right: your override.');
    } catch (err) {
      this.status(`Could not fetch the live file: ${errorMessage(err)}`, 'error');
    }
  }

  private async setEnabled(id: string, enabled: boolean): Promise<void> {
    try {
      await api.updateOverride(id, { enabled });
      this.status(`${enabled ? 'Enabled' : 'Disabled'} override`);
      if (this.settings.autoReloadOnSave) await api.reload();
    } catch (err) {
      this.status(errorMessage(err), 'error');
    }
  }

  private async deleteOverride(id: string): Promise<void> {
    const meta = this.overrides.get(id);
    if (!meta || !window.confirm(`Delete the override for ${fileName(meta.sourceUrl)}? Your edits will be lost.`)) return;
    try {
      await api.deleteOverride(id);
      for (const tab of this.editor.tabs.filter((t) => t.overrideId === id)) this.editor.close(tab);
      this.status(`Deleted override for ${fileName(meta.sourceUrl)}`);
      if (this.settings.autoReloadOnSave) await api.reload();
    } catch (err) {
      this.status(errorMessage(err), 'error');
    }
  }

  private async updateMatch(id: string, match: UrlMatcher): Promise<void> {
    const error = validateMatcher(match);
    if (error) return this.status(error, 'error');
    const meta = this.overrides.get(id);
    if (meta && !compileMatcher(match)(meta.sourceUrl)) {
      if (!window.confirm(`This pattern does not match the file it was created from:\n${meta.sourceUrl}\n\nApply anyway?`)) return;
    }
    try {
      await api.updateOverride(id, { match });
      this.status(`Now matching ${match.type}: ${match.pattern}`);
      if (this.settings.autoReloadOnSave) await api.reload();
    } catch (err) {
      this.status(errorMessage(err), 'error');
    }
  }

  private closeTab(tab: Tab): void {
    if (this.editor.isDirty(tab) && !window.confirm(`Discard unsaved edits to ${fileName(tab.url)}?`)) return;
    this.editor.close(tab);
  }

  // ---------------------------------------------------------------- chrome

  private bindChrome(): void {
    this.el.url.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const url = this.el.url.value.trim();
      if (url) void api.navigate(url);
    });
    this.el.url.addEventListener('focus', () => this.el.url.select());
    this.el.back.addEventListener('click', () => void api.goBack());
    this.el.forward.addEventListener('click', () => void api.goForward());
    this.el.reload.addEventListener('click', () => void api.reload());
    this.el.devtools.addEventListener('click', () => void api.openPageDevTools());
    this.el.folderButton.addEventListener('click', () => void api.revealOverridesFolder());
    this.el.settingsButton.addEventListener('click', () => {
      this.el.settingsPanel.hidden = !this.el.settingsPanel.hidden;
      this.el.settingsButton.classList.toggle('active', !this.el.settingsPanel.hidden);
    });
    this.el.filter.addEventListener('input', () => {
      this.filter = this.el.filter.value.trim();
      this.schedule('sidebar');
    });
    this.bindSplitter();

    window.addEventListener('beforeunload', (e) => {
      if (this.editor.tabs.some((t) => this.editor.isDirty(t))) {
        e.preventDefault();
        e.returnValue = false;
      }
    });
  }

  private bindSplitter(): void {
    const root = document.documentElement;
    try {
      const saved = localStorage.getItem('page-width');
      if (saved) root.style.setProperty('--page-width', saved);
    } catch {
      // Storage unavailable: keep the default split.
    }
    this.el.splitter.addEventListener('pointerdown', (down) => {
      down.preventDefault();
      // The page is a native view that would swallow pointer events mid-drag; hide it meanwhile.
      this.pageHidden = true;
      this.sendPageBounds();
      document.body.classList.add('resizing');
      const move = (e: PointerEvent) => {
        const width = Math.min(Math.max(window.innerWidth - e.clientX, 320), window.innerWidth - 560);
        root.style.setProperty('--page-width', `${width}px`);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.classList.remove('resizing');
        this.pageHidden = false;
        this.sendPageBounds();
        try {
          localStorage.setItem('page-width', root.style.getPropertyValue('--page-width'));
        } catch {
          // Not persisted; fine.
        }
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  private observePageBounds(): void {
    new ResizeObserver(() => this.sendPageBounds()).observe(this.el.pageHost);
    window.addEventListener('resize', () => this.sendPageBounds());
  }

  private sendPageBounds(): void {
    const r = this.el.pageHost.getBoundingClientRect();
    const visible = !!this.page.url && !this.pageHidden;
    api.setPageBounds(visible ? { x: r.left, y: r.top, width: r.width, height: r.height } : { x: 0, y: 0, width: 0, height: 0 });
  }

  private status(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    window.clearTimeout(this.statusTimer);
    this.el.statusMessage.textContent = message;
    this.el.statusMessage.className = `status-${level}`;
    this.el.statusMessage.title = message;
    if (level === 'info') this.statusTimer = window.setTimeout(() => (this.el.statusMessage.textContent = ''), 8000);
  }

  // ---------------------------------------------------------------- rendering

  private schedule(...parts: Array<'sidebar' | 'editor'>): void {
    for (const part of parts) this.pending[part] = true;
    if (this.pending.frame) return;
    this.pending.frame = requestAnimationFrame(() => {
      this.pending.frame = 0;
      if (this.pending.sidebar) this.renderSidebar();
      if (this.pending.editor) {
        this.renderTabs();
        this.renderFileHeader();
        this.el.empty.hidden = !!this.editor.active;
      }
      this.renderStatus();
      this.pending.sidebar = this.pending.editor = false;
    });
  }

  private renderSidebar(): void {
    const active = this.editor.active;
    renderSidebar(this.el.sidebarList, {
      filter: this.filter,
      overrides: [...this.overrides.values()],
      resources: [...this.resources.values()],
      hits: this.hits,
      upstreamChanged: this.upstreamChanged,
      activeUrl: active && !active.overrideId ? active.url : null,
      activeOverrideId: active?.overrideId ?? null,
      onOpenResource: (url) => void this.openResource(url),
      onOpenOverride: (id) => void this.openOverride(id),
      onToggleOverride: (id, enabled) => void this.setEnabled(id, enabled),
      onDeleteOverride: (id) => void this.deleteOverride(id),
    });
  }

  private renderTabs(): void {
    this.el.tabs.replaceChildren(
      ...this.editor.tabs.map((tab) =>
        h(
          'div',
          {
            class: `tab${tab === this.editor.active ? ' active' : ''}${tab.overrideId ? ' is-override' : ''}`,
            title: tab.url,
            role: 'tab',
            onClick: () => this.editor.activate(tab),
            onAuxclick: (e: MouseEvent) => e.button === 1 && this.closeTab(tab),
          },
          kindBadge(tab.kind),
          h('span', { class: 'tab-name' }, fileName(tab.url)),
          this.editor.isDirty(tab) ? h('span', { class: 'dirty', title: 'Unsaved changes' }, '●') : null,
          h(
            'button',
            {
              class: 'icon-button tab-close',
              title: 'Close',
              onClick: (e: Event) => {
                e.stopPropagation();
                this.closeTab(tab);
              },
            },
            icon('close'),
          ),
        ),
      ),
    );
  }

  /** Rebuilt only when something it shows changed, so typing in its inputs isn't interrupted. */
  private renderFileHeader(): void {
    const tab = this.editor.active;
    const meta = tab?.overrideId ? this.overrides.get(tab.overrideId) : undefined;
    const key = JSON.stringify([
      tab?.id,
      tab?.overrideId,
      tab && this.editor.isDirty(tab),
      this.editor.diffMode,
      meta?.enabled,
      meta?.match,
      meta && this.upstreamChanged.has(meta.id),
    ]);
    if (key === this.headerKey) return;
    this.headerKey = key;
    if (!tab) {
      this.el.fileHeader.replaceChildren();
      return;
    }

    const dirty = this.editor.isDirty(tab);
    const diff = this.editor.diffMode;
    const rows: HTMLElement[] = [
      h(
        'div',
        { class: 'file-row' },
        kindBadge(tab.kind),
        h('span', { class: 'file-url', title: tab.url }, tab.url),
        meta
          ? h('span', { class: `state ${meta.enabled ? 'state-on' : 'state-off'}` }, meta.enabled ? 'Override active' : 'Override disabled')
          : h('span', { class: 'state state-original' }, 'Live file · not overridden'),
        button('Pretty-print', () => void this.format(), { title: 'Format the document (Shift+Alt+F)' }),
        button(diff === 'base' ? 'Close diff' : 'Diff', () => (diff === 'base' ? this.editor.hideDiff() : this.editor.showDiff('base')), {
          title: 'Compare with the text you started from (Ctrl/Cmd+Shift+D)',
        }),
        meta
          ? button(diff === 'upstream' ? 'Close compare' : 'Compare live', () => (diff === 'upstream' ? this.editor.hideDiff() : void this.compareWithLive()), {
              title: 'Compare your override with the file the server sends now',
            })
          : null,
        h(
          'button',
          {
            class: 'button primary',
            disabled: !!meta && !dirty,
            title: meta ? 'Save and reload (Ctrl/Cmd+S)' : 'Serve this edited file instead of the live one (Ctrl/Cmd+S)',
            onClick: () => void this.save(),
          },
          meta ? (dirty ? 'Save' : 'Saved') : 'Create override',
        ),
      ),
    ];

    if (meta) {
      rows.push(this.matchRow(meta));
      const hint = this.hashHint(meta);
      if (hint) rows.push(hint);
    }
    if (meta && this.upstreamChanged.has(meta.id)) {
      rows.push(
        h(
          'div',
          { class: 'banner warn' },
          icon('warning'),
          h('span', {}, 'The live file changed since you created this override (new deploy?). Your override still replaces it.'),
          button('Compare live', () => void this.compareWithLive()),
        ),
      );
    }
    this.el.fileHeader.replaceChildren(...rows);
  }

  private matchRow(meta: OverrideMeta): HTMLElement {
    const type = h(
      'select',
      { title: 'How the request URL is matched' },
      ...(['exact', 'glob', 'regex'] as MatchType[]).map((t) => h('option', { value: t, selected: meta.match.type === t }, t)),
    );
    const pattern = h('input', { class: 'pattern', value: meta.match.pattern, spellcheck: 'false', title: 'URL pattern' });
    const ignoreQuery = h('input', { type: 'checkbox', checked: meta.match.ignoreQuery });
    const apply = () => void this.updateMatch(meta.id, { type: type.value as MatchType, pattern: pattern.value.trim(), ignoreQuery: ignoreQuery.checked });
    pattern.addEventListener('keydown', (e) => e.key === 'Enter' && apply());
    return h(
      'div',
      { class: 'file-row match-row' },
      h('span', { class: 'label' }, 'Match'),
      type,
      pattern,
      h('label', { class: 'check', title: 'Ignore ?query and #hash when matching' }, ignoreQuery, 'ignore query'),
      button('Apply', apply),
    );
  }

  /** Offers a glob when the file name carries a build hash, so the override survives redeploys. */
  private hashHint(meta: OverrideMeta): HTMLElement | null {
    const glob = suggestHashGlob(meta.sourceUrl);
    if (!glob || (meta.match.type === 'glob' && meta.match.pattern === glob)) return null;
    return h(
      'div',
      { class: 'banner info' },
      h('span', {}, `${fileName(meta.sourceUrl)} has a build hash in its name, so this override stops matching after the next deploy.`),
      button(`Match every build (${fileName(glob)})`, () => void this.updateMatch(meta.id, { type: 'glob', pattern: glob, ignoreQuery: true })),
    );
  }

  private renderSettings(): void {
    const rows = (Object.keys(SETTING_LABELS) as Array<keyof Settings>).map((key) => {
      const [label, help] = SETTING_LABELS[key];
      return h(
        'label',
        { class: 'setting', title: help },
        h('input', {
          type: 'checkbox',
          checked: this.settings[key],
          onChange: async (e: Event) => {
            try {
              this.settings = await api.updateSettings({ [key]: (e.target as HTMLInputElement).checked });
            } catch (err) {
              this.status(errorMessage(err), 'error');
            }
          },
        }),
        h('span', {}, h('strong', {}, label), h('small', {}, help)),
      );
    });
    this.el.settingsPanel.replaceChildren(h('h2', {}, 'Settings'), ...rows);
  }

  private renderStatus(): void {
    this.el.statusPage.textContent = this.page.loading ? `Loading ${this.page.url}…` : this.page.title || this.page.url || 'No page loaded';
    this.el.statusPage.title = this.page.url;
    const all = [...this.overrides.values()];
    const enabled = all.filter((o) => o.enabled).length;
    this.el.statusCounts.textContent = all.length ? `${enabled}/${all.length} overrides active` : 'No overrides';
    this.el.reload.classList.toggle('spinning', this.page.loading);
  }
}

void new App().start();
