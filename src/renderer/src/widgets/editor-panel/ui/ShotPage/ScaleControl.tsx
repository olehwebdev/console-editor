import type { Shot } from '@common/types';
import { api, errorMessage } from '@/shared/api';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';

/** The scales a design is usually exported at. */
const SCALES = [1, 2, 3] as const;

/** A design's export scale (image pixels per CSS pixel), which decides the width it is compared at. */
export function ScaleControl({ shot }: { shot: Shot }) {
  const set = async (scale: number) => {
    try {
      await api.setShotScale(shot.id, scale);
    } catch (err) {
      toast({ title: 'Could not change the scale', description: errorMessage(err), tone: 'danger' });
    }
  };
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Exported at">
      <span className="mr-1 text-[12px] text-fg-subtle">Exported at</span>
      {SCALES.map((scale) => (
        <Button key={scale} size="sm" variant={shot.scale === scale ? 'secondary' : 'ghost'} aria-pressed={shot.scale === scale} onClick={() => void set(scale)} data-testid={`shot-scale-${scale}`}>
          {scale}×
        </Button>
      ))}
    </div>
  );
}
