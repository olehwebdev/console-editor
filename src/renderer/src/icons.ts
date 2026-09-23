const PATHS = {
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  forward: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  reload: '<path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  devtools: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** Inline SVG icon (stroke style) that inherits the current text color. */
export function icon(name: IconName): SVGSVGElement {
  const wrapper = document.createElement('span');
  wrapper.innerHTML = `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
  return wrapper.firstElementChild as SVGSVGElement;
}
