import { useState } from 'react';
import { MAX_HEADER_EDITS } from '@common/rules';
import type { OverrideMeta } from '@common/types';
import { icons, KEY } from '@/shared/config';
import { cn } from '@/shared/lib';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import type { TabMeta } from '@/entities/editor-tab';
import { BLANK_HEADER_EDIT, HeaderEditList, nextRowKey } from '@/entities/rule';
import {
  applyResponse,
  fromForm,
  invalidFields,
  ruleOf,
  sameResponseRule,
  setPendingRule,
  toForm,
  type ResponseRuleForm,
  type ResponseRuleValue,
} from '../../model';
import { MethodMenu } from './MethodMenu';
import { NumberField } from './NumberField';

/**
 * What a response tab's override asks of a request besides its URL (method, GraphQL operation) and
 * how it answers besides its body (status, delay, header changes). A saved override's edits wait for
 * Apply; an unsaved tab keeps them, and saving it creates its override with them. Key it by the tab.
 */
export function ResponseRule({ tab, override }: { tab: TabMeta; override?: OverrideMeta }) {
  const saved = ruleOf(override ?? tab);
  // Fields as typed, with the rule they were made to: once that changes (applied, or changed elsewhere) they are dropped.
  const [draft, setDraft] = useState<{ base: ResponseRuleValue; form: ResponseRuleForm } | null>(null);
  const form = draft && sameResponseRule(draft.base, saved) ? draft.form : toForm(saved);
  const value = fromForm(form);
  const invalid = invalidFields(value);
  const dirty = !!override && !sameResponseRule(value, saved);

  const change = (patch: Partial<ResponseRuleForm>) => {
    const next = { ...form, ...patch };
    if (override) return setDraft({ base: saved, form: next });
    const rule = fromForm(next);
    setPendingRule(tab.id, rule);
    setDraft({ base: rule, form: next });
  };
  const apply = () => {
    if (override && dirty) void applyResponse(override.id, value);
  };
  const setHeaders = (headers: ResponseRuleForm['headers'], rowKeys: string[]) => change({ headers, rowKeys });

  return (
    <div className="flex flex-col gap-1.5 border-t border-line px-3 py-2" data-testid="response-rule">
      {/* Each group wraps whole: a narrow editor puts the answer under the request, never a field alone. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[12px] text-fg-subtle">Request</span>
          <MethodMenu value={form.method} onChange={(method) => change({ method })} />
          <Input
            size="sm"
            mono
            value={form.operation}
            invalid={invalid.operation}
            placeholder="Any GraphQL operation"
            aria-label="GraphQL operation"
            title="The GraphQL operation the request names (empty: any body)"
            data-testid="response-operation"
            className="w-44 min-w-24 shrink"
            onChange={(e) => change({ operation: e.target.value })}
            onKeyDown={(e) => e.key === KEY.enter && apply()}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-fg-subtle">Answer</span>
          <NumberField value={form.status} label="Status" invalid={invalid.status} onChange={(status) => change({ status })} onEnter={apply} className="w-14" testId="response-status" />
          <NumberField
            value={form.delay}
            label="Delay before answering (ms)"
            invalid={invalid.delay}
            onChange={(delay) => change({ delay })}
            onEnter={apply}
            leading={<Icon icon={icons.DelayIcon} size={12} className="text-fg-subtle" />}
            trailing={<span className="text-fg-subtle">ms</span>}
            className="w-24"
            testId="response-delay"
          />
          <Button
            size="sm"
            variant="ghost"
            leading={<Icon icon={icons.AddIcon} size={BUTTON_ICON_SIZE.sm} />}
            disabled={form.headers.length >= MAX_HEADER_EDITS}
            onClick={() => setHeaders([...form.headers, { ...BLANK_HEADER_EDIT }], [...form.rowKeys, nextRowKey()])}
            data-testid="response-header-add"
          >
            Header
          </Button>
          <Switch
            size="sm"
            checked={form.send}
            onCheckedChange={(send) => change({ send })}
            label="Send request"
            title={form.send ? 'The request reaches the server, and its response is replaced' : 'Answered before it is sent: the server never sees it (a POST changes nothing)'}
          />
        </div>
        {override ? (
          <Button size="sm" variant={dirty ? 'primary' : 'ghost'} disabled={!dirty} onClick={apply} className={cn('ml-auto', !dirty && 'opacity-60')} data-testid="response-apply">
            Apply
          </Button>
        ) : null}
      </div>
      {form.headers.length ? <HeaderEditList headers={form.headers} rowKeys={form.rowKeys} onChange={setHeaders} testId="response-headers" /> : null}
    </div>
  );
}
