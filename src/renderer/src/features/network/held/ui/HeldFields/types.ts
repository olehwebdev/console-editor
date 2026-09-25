import type { HeldRequest } from '@common/types';
import type { HeldDraft } from '../../model';

export interface StageFieldsProps {
  held: HeldRequest;
  draft: HeldDraft;
  change(patch: Partial<HeldDraft>): void;
}
