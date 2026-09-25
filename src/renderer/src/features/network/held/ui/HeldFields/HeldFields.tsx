import { MAX_HEADER_EDITS } from '@common/rules';
import type { HeldRequest } from '@common/types';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { BLANK_HEADER_EDIT, HeaderEditList, nextRowKey } from '@/entities/rule';
import { useHeldDrafts, type HeldDraft } from '../../model';
import { STAGE_FIELDS } from './stageFields';

// Actions never change, so they are read once instead of subscribed to.
const { patch } = useHeldDrafts.getState();

/**
 * What can be changed on a held request besides its body: before it is sent, its method, URL and
 * headers; at its response, the status and headers the page gets. Header changes go on top of its own.
 */
export function HeldFields({ held }: { held: HeldRequest }) {
  const draft = useHeldDrafts((s) => s.drafts[held.id]);
  if (!draft) return null;
  const Fields = STAGE_FIELDS[held.stage];
  const change = (next: Partial<HeldDraft>) => patch(held.id, next);
  const setHeaders = (headers: HeldDraft['headers'], rowKeys: string[]) => change({ headers, rowKeys });

  return (
    <div className="flex flex-col gap-1.5 border-t border-line px-3 py-2" data-testid="held-fields">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Fields held={held} draft={draft} change={change} />
        <Button
          size="sm"
          variant="ghost"
          leading={<Icon icon={icons.AddIcon} size={BUTTON_ICON_SIZE.sm} />}
          disabled={draft.headers.length >= MAX_HEADER_EDITS}
          onClick={() => setHeaders([...draft.headers, { ...BLANK_HEADER_EDIT }], [...draft.rowKeys, nextRowKey()])}
          data-testid="held-header-add"
        >
          Header
        </Button>
      </div>
      {draft.headers.length ? <HeaderEditList headers={draft.headers} rowKeys={draft.rowKeys} onChange={setHeaders} testId="held-headers" /> : null}
    </div>
  );
}
