import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import { App } from './App';

/** The element index.html gives the app to render into. */
const ROOT_ID = 'root';

// Zod probes for `new Function` to speed up parsing; the page's CSP forbids it and reports the probe as a violation.
z.config({ jitless: true });

createRoot(document.getElementById(ROOT_ID)!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
