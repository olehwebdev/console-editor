/**
 * Page-side helpers of the adapter (`ADAPTER_SOURCE`): a value's one-line
 * preview, an element's label, and an object's entries, each function kept by
 * `fn` (its index among the functions whose places are looked up).
 */
export const PREVIEW_JS = `
  const MAX_TEXT = 80;
  const MAX_KEYS = 5;
  const MAX_ITEMS = 60;
  const typeName = (type) => (typeof type === 'string' ? type : (type && (type.displayName || type.name)) || 'Component');
  const brief = (value) => (value && typeof value === 'object' ? (Array.isArray(value) ? '[…]' : '{…}') : preview(value));
  const preview = (value) => {
    try {
      if (value === null) return 'null';
      if (typeof value === 'string') return JSON.stringify(value.length > MAX_TEXT ? value.slice(0, MAX_TEXT) + '…' : value);
      if (typeof value === 'function') return 'ƒ ' + (value.name || 'anonymous');
      if (typeof value !== 'object') return String(value);
      if (Array.isArray(value)) return 'Array(' + value.length + ')';
      if (value.$$typeof) return '<' + typeName(value.type) + ' />';
      if (value instanceof Element) return '<' + value.tagName.toLowerCase() + '>';
      if (value instanceof Map || value instanceof Set) return value.constructor.name + '(' + value.size + ')';
      const keys = Object.keys(value);
      const proto = Object.getPrototypeOf(value);
      const name = proto && proto !== Object.prototype && proto.constructor && proto.constructor.name ? proto.constructor.name + ' ' : '';
      return name + '{' + keys.slice(0, MAX_KEYS).map((key) => key + ': ' + brief(value[key])).join(', ') + (keys.length > MAX_KEYS ? ', …' : '') + '}';
    } catch (err) {
      // A getter or a proxy trap threw.
      return '…';
    }
  };
  const label = (el) => ({ tag: el.tagName.toLowerCase(), id: el.id || '', classes: Array.from(el.classList).slice(0, 4) });
  const entries = (object, fn) => {
    if (!object || typeof object !== 'object') return [];
    return Object.keys(object).slice(0, MAX_ITEMS).map((name) => {
      const value = object[name];
      return { name, preview: preview(value), fn: fn(value) };
    });
  };
  const listeners = (props, fn) =>
    Object.keys(props || {})
      .filter((name) => /^on[A-Z]/.test(name))
      .slice(0, MAX_ITEMS)
      .map((name) => {
        const handler = Array.isArray(props[name]) ? props[name][0] : props[name];
        return { name, function: (handler && handler.name) || 'anonymous', fn: fn(handler) };
      })
      .filter((handler) => handler.fn >= 0);
`;
