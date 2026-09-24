import { useLayout } from '../../model/layout';

const { setRowWidth } = useLayout.getState();

/** Ref callback: panels are fitted to the row, so the layout follows its width for as long as it exists. */
export function followRowWidth(row: HTMLDivElement) {
  const measure = () => setRowWidth(row.clientWidth);
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(row);
  return () => observer.disconnect();
}
