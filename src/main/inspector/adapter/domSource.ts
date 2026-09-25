import { MAX_HOST_KIDS, MAX_SELECTOR_ROOTS, MAX_SELECTOR_STEPS } from '../constants';

/**
 * Page-side DOM helpers of the adapter (`ADAPTER_SOURCE`) for frameworks whose
 * components are elements (Angular's hosts, custom elements): an element's
 * parent, out of a shadow root to its host; and the nearest component hosts
 * under a host, in its light DOM and its shadow root. And CSS selectors that
 * find an element again (after a reload too), one per root from the document in
 * through each open shadow root: its id when that is unique there, else its
 * place under the nearest ancestor with one, or under body.
 */
export const DOM_JS = `
  const uniqueIn = (root, selector) => {
    try {
      return root.querySelectorAll(selector).length === 1;
    } catch (err) {
      return false;
    }
  };
  // Within the element's root (its document, or a shadow root): its id, else its place under an ancestor's.
  const selectorIn = (el, root) => {
    const steps = [];
    for (let node = el; node && steps.length < ${MAX_SELECTOR_STEPS}; node = node.parentElement) {
      const id = node.id ? '#' + CSS.escape(node.id) : '';
      if (id && uniqueIn(root, id)) return [id].concat(steps).join(' > ');
      if (node === root.body || !node.parentElement) {
        const selector = [node.localName].concat(steps).join(' > ');
        return uniqueIn(root, selector) ? selector : null;
      }
      const same = Array.from(node.parentElement.children).filter((child) => child.localName === node.localName);
      steps.unshift(same.length > 1 ? node.localName + ':nth-of-type(' + (same.indexOf(node) + 1) + ')' : node.localName);
    }
    return null;
  };
  // One selector per root, from the document in through each open shadow root; none through a closed one.
  const selectorOf = (el) => {
    const path = [];
    for (let node = el; node && path.length < ${MAX_SELECTOR_ROOTS}; ) {
      const root = node.getRootNode();
      const step = selectorIn(node, root);
      if (!step) return null;
      path.unshift(step);
      if (root === node.ownerDocument) return path;
      if (!root.host || root.host.shadowRoot !== root) return null;
      node = root.host;
    }
    return null;
  };
  const outOf = (node) => node.parentElement || (node.parentNode && node.parentNode.host) || null;
  const hostKids = (host, isHost) => {
    const out = [];
    const walk = (root) => {
      for (const child of root.children) {
        if (out.length >= ${MAX_HOST_KIDS}) return;
        if (isHost(child)) {
          out.push(child);
          continue;
        }
        walk(child);
        if (child.shadowRoot) walk(child.shadowRoot);
      }
    };
    walk(host);
    if (host.shadowRoot) walk(host.shadowRoot);
    return out;
  };
`;
