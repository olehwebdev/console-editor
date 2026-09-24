import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

/** The element index.html gives the app to render into. */
const ROOT_ID = 'root';

createRoot(document.getElementById(ROOT_ID)!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
