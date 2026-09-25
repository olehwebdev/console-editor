import type { StateActionInput } from './types';

/**
 * The action's first lines: what it does, and the element the component's chain was read from (it throws
 * when that's gone). An element in shadow roots is found host by host, through each one's `shadowRoot`.
 */
export function findElement({ selector, depth, component, label, edit }: StateActionInput): string {
  const [first, ...inner] = selector;
  const shown = selector.join(' ▸ ');
  const place = depth ? `the component ${depth} up from the one that rendered ${shown}` : `the component that rendered ${shown}`;
  const find = inner.length
    ? `// One selector for the document, then one for each shadow root in.
const path = ${JSON.stringify(selector)};
let element = document.querySelector(path[0]);
for (const step of path.slice(1)) element = element && element.shadowRoot && element.shadowRoot.querySelector(step);
if (!element) throw new Error(\`Nothing on this page matches \${path.join(' ▸ ')}\`);`
    : `const selector = ${JSON.stringify(first)};
const element = document.querySelector(selector);
if (!element) throw new Error(\`Nothing on this page matches \${selector}\`);`;
  return `// Sets ${label} of ${component} to ${edit.json}: ${place}. Saved from the Component page.
${find}`;
}
