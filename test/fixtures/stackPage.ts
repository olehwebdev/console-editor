/**
 * A page carrying what Vue 3 (with Pinia), Angular, Next.js and webpack leave in
 * a page, as docs/INSPECTOR_RESEARCH.md §2 probed them in real builds: the page
 * stack should name each one.
 */
export const STACK_PATH = '/stack.html';

export const STACK_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Page stack</title></head>
<body>
  <div id="app" data-v-app></div>
  <app-root ng-version="17.3.0"></app-root>
  <p>A page that looks like it runs Vue, Pinia, Angular, Next.js and webpack.</p>
  <script>
    document.getElementById('app').__vue_app__ = { version: '3.5.43', _context: {}, config: { globalProperties: { $pinia: {} } } };
    window.__NEXT_DATA__ = { page: '/' };
    window.next = { version: '15.1.0' };
    (self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([]);
  </script>
</body>
</html>`;
