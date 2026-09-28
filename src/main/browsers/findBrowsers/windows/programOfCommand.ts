/** The program a registry command starts: its first argument, quoted (`"C:\…\chrome.exe" --flag`) or not. */
export function programOfCommand(command: string): string | null {
  const trimmed = command.trim();
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1);
    return end > 1 ? trimmed.slice(1, end) : null;
  }
  return trimmed.split(/\s+/)[0] || null;
}
