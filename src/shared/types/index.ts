/**
 * Types shared between the main process, the preload bridge and the renderer,
 * by domain. Keep these files free of runtime imports (other than of each
 * other) so every bundle can include them.
 */

export type { ActionInput, ActionPatch, ActionsWindowState, ConsoleAction } from './actions';
export type { ConsoleEditorApi } from './api';
export type { ConsoleEntry, ConsoleFrame, ConsoleLevel, ConsoleLocation, ConsoleProperty, ConsoleSource, ConsoleValue, ConsoleValueKind } from './console';
export { CONSOLE_LEVELS } from './console';
export type { AppEvent, EngineEvent } from './events';
export type {
  CodeLocation,
  ComponentLink,
  ComponentNode,
  ComponentTreeLevel,
  FrameStack,
  InspectedComponent,
  InspectedContext,
  InspectedElement,
  InspectedHandler,
  InspectedListener,
  InspectedState,
  InspectedValue,
  InspectFramework,
  InspectHover,
  RenderChange,
  RenderCommit,
  RenderedComponent,
  RenderKind,
  RenderReason,
  RenderReasonKind,
  RenderTrigger,
  ScriptCoverage,
  StackHit,
  StateEdit,
  StateKind,
} from './inspector';
export { INSPECT_FRAMEWORKS, RENDER_KINDS, RENDER_REASONS, STATE_KINDS } from './inspector';
export type { MenuCommand } from './menu';
export type { CreateOverrideInput, MatchType, Override, OverrideMeta, OverridePatch, OverrideWithContent, UrlMatcher } from './overrides';
export { MATCH_TYPES } from './overrides';
export type { PageState, Rect } from './page';
export type { ResourceContent, ResourceEntry, ResourceKind } from './resources';
export { RESOURCE_KINDS } from './resources';
export type { BlockRule, CorsRule, CreateRuleInput, HeaderEdit, HeaderOperation, HeaderRule, Rule, RuleAction, RuleBase, RuleOf, RulePatch, RuleResourceType } from './rules';
export { HEADER_OPERATIONS, RULE_ACTIONS, RULE_RESOURCE_TYPES } from './rules';
export type { SessionDraft, SessionState, SessionTab } from './session';
export type { SourceMapBody, SourceMapFetchFailure, SourceMapFile, SourceMapFileInfo, SourceMapKind, SourceMapRequest } from './sourceMaps';
export { SOURCE_MAP_KINDS } from './sourceMaps';
export type { Settings } from './settings';
export { DEFAULT_SETTINGS } from './settings';
export type { AppInfo, AvailableUpdate, UpdateInstall, UpdateState } from './updates';
export type { MissedReason, WorkerType } from './workers';
export type { Workspace, WorkspaceColor, WorkspaceIcon, WorkspacePatch, WorkspacesState } from './workspaces';
export { WORKSPACE_COLORS, WORKSPACE_ICONS } from './workspaces';
