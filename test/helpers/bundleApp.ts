/**
 * Bundles a fixture app (test/fixtures/apps) into one script with Vite, from the
 * repo's own dependencies: minified with a source map in production, readable in
 * development, as a site would ship either.
 */
import { join } from 'node:path';
import { build, type Rollup } from 'vite';

export interface BundledApp {
  /** Served as `/<name>.js`; in production it ends by naming `/<name>.js.map`. */
  code: string;
  map: string | null;
}

export async function bundleApp(entry: string, name: string, mode: 'production' | 'development'): Promise<BundledApp> {
  const production = mode === 'production';
  const result = (await build({
    configFile: false,
    logLevel: 'silent',
    mode,
    root: join(__dirname, '../fixtures/apps'),
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    build: { write: false, minify: production, sourcemap: production, lib: { entry, formats: ['iife'], name: 'Fixture', fileName: () => `${name}.js` } },
  })) as Rollup.RollupOutput | Rollup.RollupOutput[];
  const [output] = Array.isArray(result) ? result : [result];
  const chunk = output.output.find((item): item is Rollup.OutputChunk => item.type === 'chunk')!;
  const map = chunk.map ? chunk.map.toString() : null;
  const comment = map && !chunk.code.includes('sourceMappingURL') ? `\n//# sourceMappingURL=${name}.js.map\n` : '';
  return { code: chunk.code + comment, map };
}
