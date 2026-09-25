import { ANY_METHOD, DEFAULT_RESPONSE } from '@common/overrides';
import type { OverrideMeta } from '@common/types';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { Tooltip } from '@/shared/ui/tooltip';
import { ROW_ICON_SIZE } from '../constants';

/** A response override's method, and its status and delay when they aren't the defaults. */
export function ResponseBadges({ override }: { override: OverrideMeta }) {
  const method = override.request?.method ?? ANY_METHOD;
  const { status, delayMs } = override.response ?? DEFAULT_RESPONSE;
  return (
    <>
      {method !== ANY_METHOD ? (
        <span data-testid="override-method" className="rounded-full bg-hover px-1.5 font-mono text-[10px] text-fg-muted">
          {method}
        </span>
      ) : null}
      {status !== DEFAULT_RESPONSE.status ? (
        <Tooltip content={`Answers with status ${status}`}>
          <span data-testid="override-status" className="rounded-full bg-warning/12 px-1.5 font-mono text-[10px] text-warning">
            {status}
          </span>
        </Tooltip>
      ) : null}
      {delayMs ? (
        <Tooltip content={`Answers after ${delayMs} ms`}>
          <span className="flex text-fg-subtle">
            <Icon icon={icons.DelayIcon} size={ROW_ICON_SIZE} />
          </span>
        </Tooltip>
      ) : null}
    </>
  );
}
