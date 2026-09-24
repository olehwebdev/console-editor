import { type ComponentType, lazy, Suspense } from 'react';
import { ControlsSection } from './sections/Controls';
import { OverlaysSection } from './sections/Overlays';

/** The optional section's module: the glob below must name it too (it takes a literal only). */
const STRUCTURE_MODULE = './sections/Structure/index.ts';

// Optional sections are picked up when present (they're added as components land).
const optional = import.meta.glob<{ StructureSection?: ComponentType }>('./sections/Structure/index.ts');
const StructureSection = optional[STRUCTURE_MODULE]
  ? lazy(async () => ({ default: (await optional[STRUCTURE_MODULE]()).StructureSection ?? (() => null) }))
  : null;

/**
 * Design-system gallery: every shared/ui component in its states.
 * Open with CONSOLE_EDITOR_GALLERY=1 (the main process loads index.html#gallery).
 */
export function Gallery() {
  return (
    <div className="h-full overflow-auto bg-canvas text-fg" data-testid="gallery">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-8 py-10">
        <header>
          <h1 className="text-lg font-medium">Console Editor design system</h1>
          <p className="mt-1 text-fg-muted">Tokens, motion and components from docs/DESIGN_SYSTEM.md.</p>
        </header>
        <ControlsSection />
        <OverlaysSection />
        {StructureSection ? (
          <Suspense fallback={null}>
            <StructureSection />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
