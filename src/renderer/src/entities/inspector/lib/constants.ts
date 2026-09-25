import type { InspectFramework } from '@common/types';

/**
 * Whether a component's name is its function's (React), so the original's name beats a minified one; Vue's is
 * its `name` option, and its function is `setup`.
 */
export const NAMED_BY_FUNCTION: Record<InspectFramework, boolean> = { react: true, vue: false };
