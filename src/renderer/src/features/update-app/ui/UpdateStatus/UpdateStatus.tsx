import { useUpdateStore } from '@/entities/app-update';
import { UpdateStatusItem } from './UpdateStatusItem';

/** Status-bar entry while an update is on offer: available, downloading, ready to install. */
export function UpdateStatus() {
  const state = useUpdateStore((s) => s.state);
  return <UpdateStatusItem state={state} />;
}
