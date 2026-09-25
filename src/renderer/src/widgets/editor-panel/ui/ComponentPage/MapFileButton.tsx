import { Button } from '@/shared/ui/button';
import { useSourceMapStore } from '@/entities/source-map';
import { forgetMapFile, loadMapFile } from '@/features/open-resource';
import { relocateComponent } from './relocateComponent';

/**
 * For a bundle with no map of its own: loading one from a file (the map a build left out, or uploaded to an
 * error tracker). For a bundle whose map came from a file: forgetting it. Nothing for one with its own map.
 */
export function MapFileButton({ bundleUrl, mapped }: { bundleUrl: string; mapped: boolean }) {
  const file = useSourceMapStore((s) => {
    const state = s.byBundle[bundleUrl];
    return state?.status === 'ready' ? state.file : undefined;
  });
  if (file) {
    return (
      <Button size="sm" variant="ghost" onClick={() => void forgetMapFile(bundleUrl).then(relocateComponent)} data-testid="forget-map-file">
        Forget {file}
      </Button>
    );
  }
  if (mapped) return null;
  return (
    <Button size="sm" variant="secondary" onClick={() => void loadMapFile(bundleUrl).then((loaded) => (loaded ? relocateComponent() : undefined))} data-testid="load-map-file">
      Load a source map…
    </Button>
  );
}
