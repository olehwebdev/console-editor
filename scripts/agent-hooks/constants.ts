/** The exit code with which a Claude Code hook hands its stderr to the agent: after an edit, to fix; on Stop, to go on. */
export const BLOCKING_EXIT = 2;

/** Files oxlint reads. */
export const LINTED_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

/**
 * The npm scripts that have to pass before the agent stops: CLAUDE.md › Before pushing, but for the tests, which take
 * longer (git's pre-push hook runs the unit tests). Each takes seconds, and they run side by side.
 */
export const STOP_CHECKS = ['typecheck', 'lint:fsd', 'lint:structure', 'lint', 'lint:unused', 'lint:duplicates', 'lint:secrets'];

/** How much of a failing check's output goes to the agent: its end, where the summary is. */
export const OUTPUT_TAIL_LINES = 40;

/** Plain output, for the agent to read. */
export const NO_COLOR_ENV = { NO_COLOR: '1', FORCE_COLOR: '0' };

/** npm runs through its `.cmd` shim on Windows, which only a shell starts. */
export const NPM = 'npm';
export const WINDOWS = 'win32';
