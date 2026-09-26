import { createFormControl } from 'react-hook-form';
import type { CreateRuleInput } from '@common/types';
import { useTabStore } from '@/entities/editor-tab';
import { RULE_FORM_OPTIONS } from './constants';
import { dropClosedRuleForms } from './dropClosedRuleForms';
import { ruleForms } from './ruleForms';

/**
 * Gives a rule page its form, starting from `saved`, unless it is open with one already. Called before
 * the page opens, so a page closed and opened again starts afresh; forms of pages closed since go.
 */
export function openRuleForm(pageId: string, saved: CreateRuleInput): void {
  dropClosedRuleForms();
  if (ruleForms.has(pageId)) return;
  const form = createFormControl<CreateRuleInput, unknown, CreateRuleInput>({ ...RULE_FORM_OPTIONS, defaultValues: saved });
  // The tab shows it holds edits, and closing it asks first.
  const stop = form.subscribe({ formState: { isDirty: true }, callback: ({ isDirty }) => useTabStore.getState().setPageDirty(pageId, !!isDirty) });
  ruleForms.set(pageId, { form, base: saved, stop });
}
