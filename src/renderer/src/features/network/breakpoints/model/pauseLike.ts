import type { NetworkRequest } from '@common/types';
import { TOAST_DURATION } from '@/shared/config';
import { toast } from '@/shared/ui/toast';
import { addBreakpoint } from './addBreakpoint';
import { breakpointLike } from './breakpointLike';
import { currentBreakpoints } from './currentBreakpoints';
import { toggleBreakpoint } from './toggleBreakpoint';

/** Pause like this: from the next one on, requests like this stop at their response. An existing breakpoint for them is turned on instead. */
export function pauseLike(request: Pick<NetworkRequest, 'url' | 'method'>): void {
  const wanted = breakpointLike(request);
  const same = currentBreakpoints().find((b) => b.stage === wanted.stage && b.method === wanted.method && b.match.type === wanted.match.type && b.match.pattern === wanted.match.pattern);
  if (same?.enabled) return;
  if (same) void toggleBreakpoint(same.id);
  else if (!addBreakpoint(wanted)) return;
  toast({ title: `The next ${request.method} ${new URL(request.url).pathname} will pause`, description: 'Its response opens for editing before the page gets it.', tone: 'success', duration: TOAST_DURATION.confirm });
}
