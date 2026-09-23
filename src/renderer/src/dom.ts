type Child = Node | string | null | undefined | false;
type Attrs = Record<string, unknown>;

/**
 * Tiny element factory: `h('button', { class: 'x', onClick: fn }, 'Label')`.
 * `on*` attributes become event listeners; `checked`/`value`/`disabled`… are set as properties.
 */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'class') {
      el.className = String(value);
    } else if (typeof value !== 'string' && key in el) {
      (el as unknown as Record<string, unknown>)[key] = value;
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(child);
  return el;
}

export function fileName(url: string): string {
  try {
    const { pathname } = new URL(url);
    const name = pathname.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : pathname === '/' ? '(index)' : pathname;
  } catch {
    return url;
  }
}

export function origin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export const KIND_LABEL = { Script: 'JS', Stylesheet: 'CSS', Document: 'HTML' } as const;
