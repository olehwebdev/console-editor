import { savedRowKeys } from '@/entities/rule';
import type { ResponseRuleForm, ResponseRuleValue } from './types';

/** A rule as its fields show it. A number that isn't one (a field left empty) shows empty. */
export function toForm({ request, response }: ResponseRuleValue): ResponseRuleForm {
  const text = (n: number) => (Number.isFinite(n) ? String(n) : '');
  return {
    method: request.method,
    operation: request.operation,
    status: text(response.status),
    delay: text(response.delayMs),
    headers: response.headers,
    rowKeys: savedRowKeys(response.headers),
    send: response.send,
  };
}
