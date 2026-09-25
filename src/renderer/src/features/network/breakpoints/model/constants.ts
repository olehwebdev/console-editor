import { ANY_METHOD } from '@common/overrides';
import type { Breakpoint, BreakpointStage } from '@common/types';

/** Starts every breakpoint id the renderer makes. */
export const BREAKPOINT_ID_PREFIX = 'bp-';

/** The methods offered for a breakpoint (a request's own unusual one is offered too). */
export const BREAKPOINT_METHODS = [ANY_METHOD, 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** How each stage reads. */
export const STAGE_LABELS: Record<BreakpointStage, string> = {
  request: 'Before sending',
  response: 'At the response',
};

/** A breakpoint being written, before it has an id. */
export type BreakpointInput = Omit<Breakpoint, 'id' | 'enabled'>;

/** What the add form starts with: any method, at the response. */
export const BLANK_BREAKPOINT: BreakpointInput = { match: { type: 'glob', pattern: '', ignoreQuery: true }, method: ANY_METHOD, stage: 'response' };

/** Stands in for a workspace without breakpoints: one stable empty list. */
export const NO_BREAKPOINTS: readonly Breakpoint[] = [];
