export function originOf(url: string | undefined): string {
  try {
    return new URL(url ?? '').origin;
  } catch {
    return url || 'This page';
  }
}
