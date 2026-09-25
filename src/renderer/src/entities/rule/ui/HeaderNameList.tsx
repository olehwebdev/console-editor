import { COMMON_HEADER_NAMES } from './constants';

/** The header names a header change's name field offers as it is typed (any other name can be typed). */
export function HeaderNameList({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {COMMON_HEADER_NAMES.map((name) => (
        <option key={name} value={name} />
      ))}
    </datalist>
  );
}
