// Adapted from beUI (https://beui.dev), MIT License, © 2026 Saurabh Chauhan.
/** Rows opt in with this attribute (`data-hover-row`); `data-hover-row="false"` opts a row out. */
export const HOVER_ROW_ATTR = 'data-hover-row';
/** Spread on a row element to opt it in: `<div {...hoverRow}>`. */
export const hoverRow = { [HOVER_ROW_ATTR]: '' } as const;

export const ROW_SELECTOR = `[${HOVER_ROW_ATTR}]:not([${HOVER_ROW_ATTR}="false"])`;
export const CONTAINER_ATTR = 'data-hover-highlight';
