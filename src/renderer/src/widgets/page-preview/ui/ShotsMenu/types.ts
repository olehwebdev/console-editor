import type { Shot } from '@common/types';

/** Which shots the menu lists: all, or one kind. */
export type ShotFilter = 'all' | Shot['kind'];
