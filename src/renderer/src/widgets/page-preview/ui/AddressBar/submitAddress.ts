import { navigate } from '@/features/navigate-page';

/** Enter in the address bar: goes to what is typed, if anything, and leaves the field. */
export function submitAddress(input: HTMLInputElement, value: string): void {
  if (!value.trim()) return;
  void navigate(value);
  input.blur();
}
