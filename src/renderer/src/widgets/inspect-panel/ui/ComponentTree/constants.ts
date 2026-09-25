import type { StackLibraryId } from '@common/stackLibraries';

/** The page stack's libraries whose components the tree lists. */
export const TREE_LIBRARIES: ReadonlySet<StackLibraryId> = new Set<StackLibraryId>(['react', 'vue']);
/** How far each level of the tree is indented. */
export const INDENT_PX = 12;
/** Where a level's "more" note starts: under its rows' names, past the chevron. */
export const MORE_START_PX = 24;
/** Room before a row's name for the chevron. */
export const ROW_START_PX = 4;
