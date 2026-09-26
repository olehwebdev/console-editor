import { exportedOverrideSchema } from '../../shared/overrides';
import type { CreateOverrideInput } from '../../shared/types';
import { responseFieldsOf } from '../store/OverrideStore/responseFieldsOf';

/**
 * What recreates an override an export file lists, checked as the app's own input is, with whether
 * it was on; null for an entry that isn't one (a hand edit, a newer version's).
 */
export function overrideInputOf(entry: unknown): (CreateOverrideInput & { enabled: boolean }) | null {
  const parsed = exportedOverrideSchema.safeParse(entry);
  if (!parsed.success) return null;
  const { request, response, ...input } = parsed.data;
  try {
    return { ...input, ...responseFieldsOf(input.kind, request, response) };
  } catch {
    return null;
  }
}
