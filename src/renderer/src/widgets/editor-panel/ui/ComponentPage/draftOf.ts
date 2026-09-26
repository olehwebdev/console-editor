/** Where editing a value starts: its preview when that is JSON already (text, numbers, true, null), else nothing. */
export function draftOf(preview: string): string {
  try {
    JSON.parse(preview);
    return preview;
  } catch {
    return '';
  }
}
