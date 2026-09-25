import { icons } from '@/shared/config';
import type { CommandGroup } from '@/shared/ui/command-palette';
import { SHORTCUT } from './constants';
import { say } from './say';

const { CssIcon, DiffIcon, HtmlIcon, JsIcon, PrettifyIcon, ReloadIcon, SaveIcon, SettingsIcon } = icons;

const KINDS = [
  { ext: 'js', icon: JsIcon, dir: 'static/js' },
  { ext: 'css', icon: CssIcon, dir: 'static/css' },
  { ext: 'html', icon: HtmlIcon, dir: 'pages' },
] as const;

/** The palette's resource rows: enough to exercise the virtualized list. */
const RESOURCE_COUNT = 2000;
const RESOURCE_NAMES = ['main', 'vendor', 'chunk', 'app', 'runtime'];
const RESOURCE_ID_PREFIX = 'r';
/** Base of the index that makes each resource's name unique (`main-1a.js`). */
const NAME_SUFFIX_RADIX = 36;

/** The demo palette's commands, then its resources. */
export function commandGroups(): CommandGroup[] {
  return [
    {
      heading: 'Commands',
      items: [
        { id: 'save', label: 'Save override', icon: SaveIcon, shortcut: SHORTCUT.save, onSelect: () => say('Saved') },
        { id: 'format', label: 'Format document', icon: PrettifyIcon, shortcut: SHORTCUT.format, keywords: ['prettify', 'beautify'], onSelect: () => say('Formatted') },
        { id: 'diff', label: 'Compare changes', icon: DiffIcon, keywords: ['diff'], onSelect: () => say('Diff opened') },
        { id: 'reload', label: 'Reload page', icon: ReloadIcon, shortcut: SHORTCUT.reload, onSelect: () => say('Reloaded') },
        { id: 'settings', label: 'Open settings', icon: SettingsIcon, shortcut: SHORTCUT.settings, keywords: ['preferences'], onSelect: () => say('Settings') },
      ],
    },
    {
      heading: 'Resources',
      items: Array.from({ length: RESOURCE_COUNT }, (_, i) => {
        const kind = KINDS[i % KINDS.length]!;
        const name = `${RESOURCE_NAMES[i % RESOURCE_NAMES.length]}-${i.toString(NAME_SUFFIX_RADIX)}.${kind.ext}`;
        return {
          id: `${RESOURCE_ID_PREFIX}${i}`,
          label: name,
          hint: `cdn.example.com/${kind.dir}`,
          icon: kind.icon,
          onSelect: () => say(`Opened ${name}`),
        };
      }),
    },
  ];
}
