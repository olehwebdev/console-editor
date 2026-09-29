import { MAX_PAGE_SIDE } from '../../shots/constants';
import type { PageMetrics } from './types';

/**
 * What a tab's page said of itself (`METRICS_EXPRESSION`'s JSON): its window and density, and the box of its whole
 * document to capture (down to the tallest page captured). A density of 1 and no sizes when it said nothing usable.
 */
export function pageMetricsOf(json: string | null | undefined): PageMetrics {
  let answer: unknown;
  try {
    answer = JSON.parse(json ?? '[]');
  } catch {
    answer = [];
  }
  const numbers = Array.isArray(answer) && answer.length === 5 && answer.every((n) => typeof n === 'number' && n > 0) ? (answer as number[]) : [0, 0, 1, 0, 0];
  const [width, height, ratio, documentWidth, documentHeight] = numbers;
  const page = documentWidth ? { x: 0, y: 0, width: documentWidth, height: Math.min(documentHeight, Math.floor(MAX_PAGE_SIDE / ratio)) } : null;
  return { window: { width, height, ratio }, page };
}
