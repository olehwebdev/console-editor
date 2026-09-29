/** Where Windows lists the browsers a user can pick as their default, for everyone, the user alone, and 32-bit ones. */
export const START_MENU_INTERNET = [
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet',
  'HKCU\\SOFTWARE\\Clients\\StartMenuInternet',
  'HKLM\\SOFTWARE\\WOW6432Node\\Clients\\StartMenuInternet',
] as const;

/** `reg query <key> /s`: the key and every key below it. */
export const REG = { program: 'reg', query: 'query', recursive: '/s', timeoutMs: 10_000 } as const;

/** The key under a browser's that holds the command starting it. */
export const OPEN_COMMAND_KEY = '\\shell\\open\\command';

/** How `reg query` names a key's unnamed value. */
export const DEFAULT_VALUE = '(default)';

/** A value's line in `reg query`'s output: four spaces before its name, its type and its data. */
export const REG_VALUE_LINE = /^ {4}(.+?) {4}(REG_[A-Z_]+)(?: {4}(.*))?$/;
