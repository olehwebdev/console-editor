/** One way a file breaks the code-structure rules. */
export interface Violation {
  /** Path from the repository root. */
  file: string;
  /** 1-based, where it applies. */
  line?: number;
  rule: string;
  detail: string;
}

/** A function, component, class or store at the top level of a file. */
export interface TopLevelFunction {
  name: string;
  line: number;
}
