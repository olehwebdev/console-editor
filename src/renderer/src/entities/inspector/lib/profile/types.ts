import type { CodeLocation, RenderReasonKind } from '@common/types';

/** A component across the commits recorded: how often it took part, and how long its own renders took. */
export interface ComponentProfile {
  /** Its function's place (`locationKey`), or its name when the page gave none. */
  key: string;
  name: string;
  location: CodeLocation | null;
  mounts: number;
  renders: number;
  skips: number;
  /** Its own renders' time summed (ms), its children's not included, where React measured it; null when it never did. */
  time: number | null;
  /** How many of its renders React measured (their time is in `time`). */
  timed: number;
  /** How many of its renders each reason was among the reasons of. */
  reasons: Partial<Record<RenderReasonKind, number>>;
}

/** A profile by component, keyed as `ComponentProfile.key`. */
export type Profiles = ReadonlyMap<string, ComponentProfile>;
