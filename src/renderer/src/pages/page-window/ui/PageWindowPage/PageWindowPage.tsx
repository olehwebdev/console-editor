import { PagePreview } from '@/widgets/page-preview';
import { setAddressBar } from './setAddressBar';

/** The website's own window (to put on another screen): the preview alone, filling it. */
export function PageWindowPage() {
  return (
    <div className="h-full bg-canvas text-fg">
      <PagePreview placement="window" addressBarRef={setAddressBar} />
    </div>
  );
}
