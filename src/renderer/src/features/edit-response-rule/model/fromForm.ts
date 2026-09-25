import type { ResponseRuleForm, ResponseRuleValue } from './types';

/** The rule its fields describe. An empty number field is NaN, which validation turns down. */
export function fromForm(form: ResponseRuleForm): ResponseRuleValue {
  const number = (text: string) => (text === '' ? Number.NaN : Number(text));
  return {
    request: { method: form.method, operation: form.operation.trim() },
    response: { status: number(form.status), delayMs: number(form.delay), headers: form.headers, send: form.send },
  };
}
