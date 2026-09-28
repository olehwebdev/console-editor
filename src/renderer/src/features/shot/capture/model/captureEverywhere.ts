import type { GroupCapture } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/**
 * Captures the whole page in the app and in every browser driven with the workspace's changes, as one group; the notice
 * says which failed, and offers to open the group. Resolves with it, or null when the app's own capture failed.
 */
export async function captureEverywhere(onOpen?: (capture: GroupCapture) => void): Promise<GroupCapture | null> {
  try {
    const capture = await api.captureInEveryBrowser();
    const browsers = capture.shots.length;
    const failed = capture.failed.map((f) => `${f.browser}: ${f.reason}`).join('\n');
    const alone = browsers === 1 && !failed ? 'Open the page in a browser with your changes to capture it there too.' : undefined;
    toast({
      title: browsers === 1 ? 'Captured the whole page here only' : `Captured the whole page in ${browsers} browsers`,
      description: failed || alone,
      tone: failed ? 'warning' : 'success',
      ...(onOpen && browsers > 1 ? { action: { label: 'Compare', onClick: () => onOpen(capture) } } : {}),
    });
    return capture;
  } catch (err) {
    toast({ title: 'Could not capture the page in every browser', description: errorMessage(err), tone: 'danger' });
    return null;
  }
}
