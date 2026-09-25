/**
 * Page-side custom elements part of the adapter (`ADAPTER_SOURCE`): a web
 * component is an element whose tag is defined (`customElements.get`), its
 * class the element's constructor. Lit's classes list their reactive
 * properties (`elementProperties`), internal state flagged `state`; other
 * classes their observed attributes. Setting a state property makes Lit render.
 */
export const ELEMENT_JS = `
  const isCustom = (node) => node.nodeType === 1 && node.localName.includes('-') && !!customElements.get(node.localName);
  const elementProperties = (host) => (host.constructor.elementProperties instanceof Map ? [...host.constructor.elementProperties] : []);
  const elementSet = (host, edit) => {
    const property = elementProperties(host).find(([key, options]) => String(key) === edit.name && options && options.state);
    if (edit.kind !== 'state' || !property) return false;
    host[edit.name] = edit.value;
    return true;
  };
  const elementFind = (el) => {
    const chain = [];
    for (let node = el; node && chain.length < MAX_CHAIN; node = outOf(node)) if (isCustom(node)) chain.push(node);
    if (!chain.length) return null;
    return {
      framework: 'element',
      build: null,
      names: chain.map((host) => host.localName),
      size: chain.length,
      refs: chain,
      set: (depth, edit) => elementSet(chain[depth], edit),
      describe: (depth, fn) => {
        const host = chain[depth];
        const properties = elementProperties(host);
        const listed = (state) => properties.filter(([, options]) => !!(options && options.state) === state).slice(0, MAX_ITEMS).map(([key]) => ({ name: String(key), preview: preview(host[key]), fn: fn(host[key]) }));
        const attributes = (host.constructor.observedAttributes || []).slice(0, MAX_ITEMS).map((name) => ({ name, preview: preview(host.getAttribute(name)), fn: -1 }));
        return {
          chain: chain.map((c) => ({ name: c.localName, key: null, fn: fn(c.constructor) })),
          props: properties.length ? listed(false) : attributes,
          state: listed(true).map((e) => Object.assign(e, { kind: 'state', editable: true })),
          context: [],
          handlers: [],
        };
      },
    };
  };
  const ELEMENT_TREE = {
    top: () => hostKids(document.documentElement, isCustom),
    kids: (host) => hostKids(host, isCustom),
    element: (host) => host,
    node: (host, fn) => ({ name: host.localName, key: null, fn: fn(host.constructor) }),
    same: (a, b) => a === b,
  };
`;
