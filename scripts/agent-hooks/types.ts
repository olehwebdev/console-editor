/** The fields these hooks read from what Claude Code writes to a hook's stdin (https://code.claude.com/docs/en/hooks). */
export interface HookInput {
  /** PostToolUse on Edit, MultiEdit and Write: the file the tool changed, as an absolute path. */
  tool_input?: { file_path?: string };
  /** Stop: whether the agent is going on because a Stop hook didn't let it stop. */
  stop_hook_active?: boolean;
}

/** How an npm script went. */
export interface ScriptResult {
  script: string;
  ok: boolean;
  /** stdout and stderr, as they came. */
  output: string;
}
