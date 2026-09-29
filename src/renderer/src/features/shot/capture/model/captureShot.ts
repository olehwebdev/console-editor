import type { CaptureArea, Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { toast } from '@/shared/ui/toast';

/** What each capture is called in its notice. */
const AREA_NOUN: Record<CaptureArea, string> = { viewport: 'the page', page: 'the whole page', element: 'the element' };

/**
 * Captures the page (what its viewport shows, all of it, or a picked element); the notice offers to open it. Resolves
 * with the capture, or null when it failed (and said so).
 */
export async function captureShot(area: CaptureArea, pickId: string | null, onOpen?: (shot: Shot) => void): Promise<Shot | null> {
  try {
    const shot = area === 'element' && pickId ? await api.captureElementShot(pickId) : await api.captureShot(area === 'page' ? 'page' : 'viewport');
    toast({ title: `Captured ${AREA_NOUN[area]}`, description: shot.name, tone: 'success', ...(onOpen ? { action: { label: 'Open', onClick: () => onOpen(shot) } } : {}) });
    return shot;
  } catch (err) {
    toast({ title: `Could not capture ${AREA_NOUN[area]}`, description: errorMessage(err), tone: 'danger' });
    return null;
  }
}
