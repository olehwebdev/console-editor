/** The image types a design can be. */
const IMAGE_TYPES: ReadonlySet<string> = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** The images among what was dropped or pasted (other files are left alone). */
export function imageFilesOf(data: DataTransfer | null): File[] {
  return [...(data?.files ?? [])].filter((file) => IMAGE_TYPES.has(file.type));
}
