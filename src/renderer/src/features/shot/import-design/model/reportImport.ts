import type { DesignImport, Shot } from '@common/types';
import { toast } from '@/shared/ui/toast';

/** Says what importing designs did: how many were kept (offering to open the one when it was one), and what couldn't be. */
export function reportImport({ added, failed }: DesignImport, onOpen: (shot: Shot) => void): void {
  if (added.length) {
    const [first] = added;
    toast({
      title: added.length === 1 ? `Imported ${first.name}` : `Imported ${added.length} designs`,
      description: failed.length ? `Not imported: ${failed.map((f) => `${f.name} (${f.reason})`).join(', ')}` : undefined,
      tone: failed.length ? 'warning' : 'success',
      ...(added.length === 1 ? { action: { label: 'Open', onClick: () => onOpen(first) } } : {}),
    });
  } else if (failed.length) {
    toast({ title: failed.length === 1 ? `Could not import ${failed[0].name}` : `Could not import ${failed.length} files`, description: failed.map((f) => f.reason).join(' · '), tone: 'danger' });
  }
}
