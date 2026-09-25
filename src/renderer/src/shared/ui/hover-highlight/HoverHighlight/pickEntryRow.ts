// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
import { ROW_SELECTOR } from './constants';

/** The row keyboard focus enters on: the one with `tabindex="0"`, else the selected one, else the first. */
export function pickEntryRow(container: HTMLElement): HTMLElement | null {
  return (
    container.querySelector<HTMLElement>(`${ROW_SELECTOR}[tabindex="0"]`) ??
    container.querySelector<HTMLElement>(`${ROW_SELECTOR}[aria-selected="true"]`) ??
    container.querySelector<HTMLElement>(ROW_SELECTOR)
  );
}
