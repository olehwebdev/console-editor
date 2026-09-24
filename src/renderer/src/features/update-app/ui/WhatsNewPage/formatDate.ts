/** Read as local midnight: a bare date would be UTC midnight, the day before west of Greenwich. */
const LOCAL_MIDNIGHT = 'T00:00:00';

export function formatDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}${LOCAL_MIDNIGHT}`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
