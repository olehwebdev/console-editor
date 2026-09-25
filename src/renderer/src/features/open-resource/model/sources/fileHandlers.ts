import { errorMessage } from '@/shared/api';
import { askSourceMapWorker } from '@/shared/lib';
import { useSourceMapStore } from '@/entities/source-map';
import { UNCHANGED } from './constants';
import type { FileHandlers } from './types';

/** How each answer from main becomes a state: a new status fails typecheck until it's handled. */
export const FILE_HANDLERS: FileHandlers = {
  unchanged: async () => UNCHANGED,
  none: async ({ bundleHash }) => ({ status: 'none', bundleHash }),
  failed: async ({ failure, detail, mapUrl }) => ({ status: 'failed', failure, detail, mapUrl }),
  found: async ({ bundleHash, bundle, mapUrl, map, file }, bundleUrl) => {
    // Hand the bytes to the worker rather than copying them (maps run to tens of MB).
    const transfer = map.type === 'bytes' && map.bytes.byteOffset === 0 && map.bytes.byteLength === map.bytes.buffer.byteLength ? [map.bytes.buffer] : [];
    try {
      const reply = await askSourceMapWorker({ type: 'load', bundleUrl, mapUrl, bundle, map }, transfer);
      if (!reply.ok) return { status: 'failed', failure: reply.failure, detail: reply.detail, mapUrl };
      const checked = useSourceMapStore.getState().generation;
      return { status: 'ready', bundleHash, mapUrl, ...(file ? { file } : {}), sources: reply.sources, browseOnly: bundle === null, mismatch: false, checked };
    } catch (err) {
      return { status: 'failed', failure: 'worker', detail: errorMessage(err), mapUrl };
    }
  },
};
