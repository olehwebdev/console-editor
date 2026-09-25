/**
 * A React app for the page stack's integration test, bundled by the test itself
 * from the repo's own react and react-dom, as a production and a development build.
 */
import { createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';

function Counter() {
  const [count, setCount] = useState(0);
  return createElement('button', { id: 'count', onClick: () => setCount(count + 1) }, `Clicked ${count}`);
}

createRoot(document.getElementById('root')!).render(createElement(Counter));
