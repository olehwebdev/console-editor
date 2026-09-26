import type { FormEvent } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { UrlMatcherFields } from '@/shared/ui/url-matcher';
import { usePageStore } from '@/entities/page';
import { ActionFields } from './ActionFields';
import { FormSection } from './FormSection';
import { ResourceTypePicker } from './ResourceTypePicker';
import { RuleNotes } from './RuleNotes';
import type { RuleFormFieldsProps } from './types';

/** The rule form's fields and buttons, on the page's form. */
export function RuleFormFields({ form, onSubmit, submitLabel, onCancel, autoFocus }: RuleFormFieldsProps) {
  const pageUrl = usePageStore((s) => s.page.url);
  const { control, reset, formState, getFieldState } = useForm({ formControl: form.formControl });
  const action = useWatch({ control, name: 'action' });
  const patternError = getFieldState('match.pattern', formState).error?.message;

  // As the button: nothing is sent before something changes.
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (formState.isDirty) onSubmit();
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} aria-label="Rule" noValidate>
      <FormSection title="Applies to">
        <div className="flex flex-wrap items-center gap-2">
          <Controller
            control={control}
            name="match"
            render={({ field }) => (
              <UrlMatcherFields
                testIdPrefix="rule-match"
                value={field.value}
                onChange={field.onChange}
                error={patternError}
                patternRef={field.ref}
                autoFocus={autoFocus}
              />
            )}
          />
        </div>
      </FormSection>
      <FormSection title="Request types">
        <Controller control={control} name="resourceTypes" render={({ field }) => <ResourceTypePicker value={field.value} onChange={field.onChange} />} />
      </FormSection>
      <ActionFields action={action} control={control} />
      <RuleNotes control={control} pageUrl={pageUrl} />
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={!formState.isDirty} loading={formState.isSubmitting} data-testid="rule-submit">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button variant="ghost" disabled={!formState.isDirty} onClick={() => reset()} data-testid="rule-revert">
            Revert
          </Button>
        )}
      </div>
    </form>
  );
}
