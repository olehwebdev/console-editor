import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // One page is expected for this single-window app.
      'fsd/insignificant-slice': 'off',
      // "settings" is a mass noun; `entities/setting` would read worse than the plural.
      'fsd/inconsistent-naming': 'off',
    },
  },
]);
