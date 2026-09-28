import type { Shot } from '@common/types';
import { icons } from '@/shared/config';
import { Icon } from '@/shared/ui/icon';
import { ShotThumb } from '@/entities/shot';
import { STACK_SIZE, STACK_THUMB } from './constants';

/** The latest shots' thumbnails, stacked a little apart (the newest in front); a glyph when there are none. */
export function ShotStack({ shots }: { shots: Shot[] }) {
  if (!shots.length) return <Icon icon={icons.ShotIcon} size={14} />;
  const shown = shots.slice(0, STACK_SIZE).reverse();
  return (
    <span className="relative inline-block" style={{ width: STACK_THUMB + (shown.length - 1) * 3, height: STACK_THUMB + (shown.length - 1) * 2 }} aria-hidden>
      {shown.map((shot, i) => (
        <ShotThumb key={shot.id} shot={shot} size={STACK_THUMB} className="absolute rounded-[5px]" style={{ left: (shown.length - 1 - i) * 3, top: i * 2 }} />
      ))}
    </span>
  );
}
