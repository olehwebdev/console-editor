import type { PageTabOf } from '@/entities/editor-tab';
import { closeTab } from '@/features/close-tab';
import { createRulePage, RuleForm, setRuleDraft } from '@/features/rule/edit';
import { RulePageHeader } from './RulePageHeader';

/** A rule being written: the form, with the pattern in focus, until it is created (the tab then becomes the rule's). */
export function NewRulePage({ page }: { page: PageTabOf<'new-rule'> }) {
  return (
    <div className="h-full overflow-y-auto bg-surface-editor" data-testid="new-rule-page">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-8 pb-16 pt-10">
        <RulePageHeader action={page.seed.action} title={page.title} />
        <RuleForm
          saved={page.seed}
          draft={page.draft}
          onDraft={(draft) => setRuleDraft(page.id, draft)}
          onSubmit={() => void createRulePage(page.id)}
          onCancel={() => void closeTab(page.id)}
          submitLabel="Create rule"
          autoFocus
        />
      </div>
    </div>
  );
}
