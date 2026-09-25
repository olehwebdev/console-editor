import { icons } from '@/shared/config';
import type { IconGlyph } from '@/shared/ui/icon';
import type { FileNode, Kind } from './types';

const { CssIcon, HtmlIcon, JsIcon } = icons;

/** Glyphs in the demos' rows, inputs and buttons. */
export const ICON_SIZE = 14;

export const KIND: Record<Kind, { glyph: IconGlyph; tint: string }> = {
  js: { glyph: JsIcon, tint: 'text-kind-js' },
  css: { glyph: CssIcon, tint: 'text-kind-css' },
  html: { glyph: HtmlIcon, tint: 'text-kind-html' },
};

/** The file tree demo's resources, by origin. */
export const FILES: FileNode[] = [
  {
    id: 'app',
    name: 'app.example.com',
    origin: true,
    children: [
      {
        id: 'app/static',
        name: 'static',
        children: [
          {
            id: 'app/static/js',
            name: 'js',
            children: [
              { id: 'app/static/js/main', name: 'main.3f9a1c.js', kind: 'js', live: true },
              { id: 'app/static/js/vendor', name: 'vendor.8812aa.chunk.js', kind: 'js' },
              { id: 'app/static/js/runtime', name: 'runtime-main.js', kind: 'js' },
            ],
          },
          {
            id: 'app/static/css',
            name: 'css',
            children: [
              { id: 'app/static/css/main', name: 'main.c0ffee.css', kind: 'css', live: true },
              { id: 'app/static/css/theme', name: 'theme.css', kind: 'css' },
            ],
          },
        ],
      },
      { id: 'app/index', name: '(index)', kind: 'html' },
    ],
  },
  {
    id: 'cdn',
    name: 'cdn.jsdelivr.net',
    origin: true,
    children: [
      {
        id: 'cdn/npm',
        name: 'npm/react-dom@19',
        children: [{ id: 'cdn/npm/react-dom', name: 'react-dom.production.min.js', kind: 'js' }],
      },
    ],
  },
];

/** Open at first: the folders down to the selected file. */
export const INITIAL_EXPANDED_FOLDERS = ['app', 'app/static', 'app/static/js'];
export const INITIAL_SELECTED_FILE = 'app/static/js/main';
