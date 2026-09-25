import { MAX_HOST_KIDS } from '../constants';

/**
 * Page-side DOM helpers of the adapter (`ADAPTER_SOURCE`) for frameworks whose
 * components are elements (Angular's hosts, custom elements): an element's
 * parent, out of a shadow root to its host; and the nearest component hosts
 * under a host, in its light DOM and its shadow root.
 */
export const DOM_JS = `
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
