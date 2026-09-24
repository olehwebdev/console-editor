/**
 * Features the app can't run without, even if something else asks to disable
 * them: with RenderDocument off, Electron 44 crashes (SIGSEGV) when a page with
 * out-of-process iframe sessions reloads. Playwright's Electron launcher
 * disables it, for one.
 */
const REQUIRED_FEATURES = new Set(['RenderDocument']);

/** Separates the features in a `--disable-features` value. */
const FEATURE_SEPARATOR = ',';

/** Adds features to a `--disable-features` value without dropping ones already there. */
export function withDisabledFeatures(existing: string, features: string[]): string {
  const kept = existing
    .split(FEATURE_SEPARATOR)
    .map((f) => f.trim())
    .filter((f) => f && !REQUIRED_FEATURES.has(f));
  return [...new Set([...kept, ...features])].join(FEATURE_SEPARATOR);
}
