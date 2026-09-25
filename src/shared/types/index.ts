/**
 * Types shared between the main process, the preload bridge and the renderer,
 * by domain. Keep these files free of runtime imports (other than of each
 * other) so every bundle can include them.
 */

export type { ActionInput, ActionPatch, ActionsWindowState, ConsoleAction } from './actions';
export type { Breakpoint, BreakpointStage, FailReason, HeldAction, HeldActionType, HeldRequest, HeldResponse } from './breakpoints';
export { BREAKPOINT_STAGES, FAIL_REASONS } from './breakpoints';
export type { ConsoleEditorApi } from './api';
export type { ConsoleEntry, ConsoleFrame, ConsoleLevel, ConsoleLocation, ConsoleProperty, ConsoleSource, ConsoleValue, ConsoleValueKind } from './console';
export { CONSOLE_LEVELS } from './console';
export type { AppEvent, EngineEvent } from './events';
export type { MenuCommand } from './menu';
export type { HarImport, HttpHeader, NetworkBody, NetworkBodyGap, NetworkRequest, NetworkRequestDetail, NetworkRequestState, SocketDirection, SocketMessage, SocketMessages } from './network';
export { NETWORK_BODY_GAPS, NETWORK_REQUEST_STATES } from './network';
export type { CreateOverrideInput, MatchType, Override, OverrideMeta, OverridePatch, OverrideWithContent, RequestMatch, ResponseSettings, UnpatchedReason, UrlMatcher } from './overrides';
export { MATCH_TYPES, UNPATCHED_REASONS } from './overrides';
export type { PageState, Rect } from './page';
export type { FileKind, ResourceContent, ResourceEntry, ResourceKind } from './resources';
export { FILE_KINDS, RESOURCE_KINDS } from './resources';
export type { BlockRule, CorsRule, CreateRuleInput, HeaderEdit, HeaderOperation, HeaderRule, Rule, RuleAction, RuleBase, RuleOf, RulePatch, RuleResourceType } from './rules';
export { HEADER_OPERATIONS, RULE_ACTIONS, RULE_RESOURCE_TYPES } from './rules';
export type { SessionDraft, SessionState, SessionTab } from './session';
export type { SourceMapBody, SourceMapFetchFailure, SourceMapFile, SourceMapKind, SourceMapRequest } from './sourceMaps';
export { SOURCE_MAP_KINDS } from './sourceMaps';
export type { Settings, SwitchSetting, Throttling } from './settings';
export { DEFAULT_SETTINGS, THROTTLING_PRESETS } from './settings';
export type { AppInfo, AvailableUpdate, UpdateInstall, UpdateState } from './updates';
export type { MissedReason, WorkerType } from './workers';
export type { Workspace, WorkspaceColor, WorkspaceIcon, WorkspacePatch, WorkspacesState } from './workspaces';
export { WORKSPACE_COLORS, WORKSPACE_ICONS } from './workspaces';
