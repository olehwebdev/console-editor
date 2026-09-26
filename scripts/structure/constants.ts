/** The longest a source file may be, in lines: past it, split it (CLAUDE.md › Code structure). */
export const MAX_LINES = 150;

/** Folders whose files are checked; tests are exempt. */
export const SOURCE_ROOTS = ['src', 'scripts'];

/** Extensions of checked files; declaration files (`.d.ts`) are left out. */
export const SOURCE_EXTENSIONS = ['.ts', '.tsx'];
export const DECLARATION_SUFFIX = '.d.ts';

/** Files that hold startup statements instead of one function: the build's entry points, and each script. */
export const ENTRY_POINTS = ['src/main/index.ts', 'src/preload/index.ts', 'src/renderer/src/app/index.tsx'];
export const SCRIPTS_DIR = 'scripts';

/** Files that may hold data only, by name. */
export const DATA_FILE_NAMES = ['constants', 'types', 'index'];
export const BARREL_NAME = 'index';

/** Calls that make a component out of one (`memo(Row)`), so their result counts as a function. */
export const COMPONENT_WRAPPERS = ['memo', 'forwardRef', 'lazy'];

/** Integers so plain they never need a name (see CLAUDE.md: identity values). */
export const EQUALITY_OPERATORS = ['===', '=='];

/** A value compared with literals this many times in one if/else chain or nested ternary makes it a switch. */
export const SWITCH_LIKE_COMPARISONS = 2;

/**
 * Folders checked for names that macOS and Windows, whose file systems ignore case, can't tell apart. Tests too:
 * they are built and run there.
 */
export const CASE_CHECKED_ROOTS = ['src', 'scripts', 'test'];

/** What an import without an extension may find (Vite's `resolve.extensions`): `./Foo` reaches `foo.ts` there. */
export const MODULE_EXTENSIONS = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'];
