import { BIDI, type BidiConnection } from '../../../engine/bidi';
import { withTimeout } from '../../../engine/PageInterception';
import type { CapturedImage, Viewport } from '../../../shots/capture';
import { LOADED_EXPRESSION, SETTLE_EXPRESSION } from '../../../shots/constants';
import { LOAD_TIMEOUT_MS } from '../constants';
import { captureContext } from './captureContext';
import { evaluateIn } from './evaluateIn';

/**
 * Captures a Firefox tab's whole page laid out in `viewport` (size and density), once it has loaded and been quiet a
 * moment; the tab gets its own viewport back afterwards.
 */
export async function captureContextAt(connection: BidiConnection, context: string, { width, height, scale }: Viewport): Promise<CapturedImage> {
  // A page still loading after that is captured as it is.
  await withTimeout(evaluateIn(connection, context, LOADED_EXPRESSION, true), LOAD_TIMEOUT_MS, 'Loading the page').catch(() => undefined);
  await connection.send(BIDI.browsingContext.setViewport, { context, viewport: { width, height }, devicePixelRatio: scale });
  try {
    await evaluateIn(connection, context, SETTLE_EXPRESSION, true);
    return await captureContext(connection, context, 'page');
  } finally {
    await connection.send(BIDI.browsingContext.setViewport, { context, viewport: null, devicePixelRatio: null }).catch(() => undefined);
  }
}
