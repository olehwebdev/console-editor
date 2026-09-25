import type { ActionInput } from '@common/types';
import { TOP_FRAME_KEY } from '@/entities/frame';

/** A new action, before anything is filled in: it runs in the top page. */
export const BLANK_ACTION: ActionInput = { name: '', target: TOP_FRAME_KEY, targetName: '', code: '' };
