// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PalettePanel } from './PalettePanel';
import type { CommandPaletteProps } from './types';

/**
 * Spotlight-style command palette: fuzzy filter with highlighted matches,
 * one gliding highlight, Enter runs, Esc / backdrop closes. The result list is
 * virtualized, so it stays fast with thousands of entries (e.g. every resource
 * of a page). Rendered in a portal; the caller owns `open` and the hotkey
 * (which should ignore `event.repeat`, or a held shortcut toggles it rapidly).
 */
export function CommandPalette({ open, ...panelProps }: CommandPaletteProps) {
  // Each opening mounts a fresh panel. Re-using one key would let AnimatePresence
  // revive a panel that is still animating out, and that panel never refocuses its input.
  const [session, setSession] = useState({ open, key: open ? 1 : 0 });
  if (session.open !== open) setSession({ open, key: open ? session.key + 1 : session.key });
  return createPortal(
    <AnimatePresence>{open ? <PalettePanel key={session.key} {...panelProps} /> : null}</AnimatePresence>,
    document.body,
  );
}
