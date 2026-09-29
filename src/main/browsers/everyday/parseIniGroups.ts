/** The groups of an INI file (`[Name]` then `key=value` lines), in order, with their keys; comments and blank lines skipped. */
export function parseIniGroups(text: string): Array<{ name: string; keys: Record<string, string> }> {
  const groups: Array<{ name: string; keys: Record<string, string> }> = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const group = /^\[(.+)\]$/.exec(line);
    if (group) groups.push({ name: group[1], keys: {} });
    const eq = line.indexOf('=');
    if (!group && eq > 0 && groups.length) groups[groups.length - 1].keys[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return groups;
}
