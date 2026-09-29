import type { ShotExtension } from '../../store/ShotStore';

/** An image's type and size, read from its header. */
export interface ImageInfo {
  ext: ShotExtension;
  width: number;
  height: number;
}
