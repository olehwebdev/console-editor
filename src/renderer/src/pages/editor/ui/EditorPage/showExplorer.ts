import { useResourceFilter } from '@/features/filter-resources';
import { useLayout } from '../../model/layout';

const { setSidebar } = useLayout.getState();
const { setQuery } = useResourceFilter.getState();

/** Shows the Explorer with its filter cleared, so a bundle revealed there is listed. */
export function showExplorer(): void {
  setQuery('');
  setSidebar('explorer');
}
