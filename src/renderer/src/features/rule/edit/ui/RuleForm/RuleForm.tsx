import type { FormEvent } from 'react';
import { sameRuleInput, validateRuleInput } from '@common/rules';
import type { CreateRuleInput } from '@common/types';
import { Button } from '@/shared/ui/button';
import { UrlMatcherFields } from '@/shared/ui/url-matcher';
import type { RulePageDraft } from '@/entities/editor-tab';
import { usePageStore } from '@/entities/page';
import { initialRowKeys } from '../../model/initialRowKeys';
import { ActionFields } from './ActionFields';
import { FormSection } from './FormSection';
import { ResourceTypePicker } from './ResourceTypePicker';
import { RuleNotes } from './RuleNotes';
import type { RuleFormProps } from './types';

/**
 * Writes a rule: which URLs, which request types, and its action's own fields, with notes and
 * inline validation. Holds nothing itself: the edits are a draft the page keeps (so they survive
 * switching tabs), shown only while `saved` is still what they were made to. Enter submits.
 */
export function RuleForm({ saved, draft, onDraft, onSubmit, submitLabel, onCancel, autoFocus }: RuleFormProps) {
  const pageUrl = usePageStore((s) => s.page.url);
  const current: RulePageDraft = draft && sameRuleInput(draft.base, saved) ? draft : { base: saved, value: saved, rowKeys: initialRowKeys(saved) };
  const { value } = current;
  const changed = !sameRuleInput(value, saved);
  const error = changed ? validateRuleInput(value) : null;
  const canSubmit = changed && !error;
  const edit = (next: CreateRuleInput, rowKeys = current.rowKeys) => onDraft({ base: current.base, value: next, rowKeys });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) onSubmit();
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} aria-label="Rule">
      <FormSection title="Applies to">
        <div className="flex flex-wrap items-center gap-2">
          <UrlMatcherFields testIdPrefix="rule-match" value={value.match} onChange={(match) => edit({ ...value, match })} autoFocus={autoFocus} />
        </div>
      </FormSection>
      <FormSection title="Request types">
        <ResourceTypePicker value={value.resourceTypes} onChange={(resourceTypes) => edit({ ...value, resourceTypes })} />
      </FormSection>
      <ActionFields value={value} rowKeys={current.rowKeys} onChange={edit} />
      <RuleNotes value={value} pageUrl={pageUrl} />
      {error ? (
        <p role="alert" className="text-[12.5px] text-danger" data-testid="rule-error">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={!canSubmit} data-testid="rule-submit">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button
            variant="ghost"
            disabled={!changed}
            onClick={() => onDraft({ base: current.base, value: current.base, rowKeys: initialRowKeys(current.base) })}
            data-testid="rule-revert"
          >
            Revert
          </Button>
        )}
      </div>
    </form>
  );
}
