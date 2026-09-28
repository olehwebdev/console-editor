import type { OverlaySettings } from '../../shared/types';
import { TOP_LAYER } from './constants';

/**
 * The overlay's inline style: placed at its offset on the page (or the viewport), at its CSS size, as see-through
 * and blended as set, above everything and out of the pointer's way. Each rule `!important`, so the page's CSS for
 * canvases can't move it.
 */
export function overlayStyle(settings: OverlaySettings, width: number, height: number): string {
  const rules: Record<string, string | number> = {
    position: settings.attached === 'page' ? 'absolute' : 'fixed',
    left: `${settings.x}px`,
    top: `${settings.y}px`,
    width: `${width}px`,
    height: `${height}px`,
    'max-width': 'none',
    margin: 0,
    padding: 0,
    border: 0,
    opacity: settings.opacity,
    'mix-blend-mode': settings.blend,
    filter: settings.invert ? 'invert(1)' : 'none',
    display: settings.hidden ? 'none' : 'block',
    'pointer-events': 'none',
    'z-index': TOP_LAYER,
  };
  return Object.entries(rules)
    .map(([name, value]) => `${name}: ${value} !important;`)
    .join(' ');
}
