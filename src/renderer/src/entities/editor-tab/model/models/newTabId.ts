const TAB_ID_PREFIX = 'tab-';
/** Tab ids outlive a run (they name the tab's saved draft), so they must not repeat across runs. */
const runId = Date.now().toString(36);
let nextId = 1;

export function newTabId(): string {
  return `${TAB_ID_PREFIX}${runId}-${nextId++}`;
}
