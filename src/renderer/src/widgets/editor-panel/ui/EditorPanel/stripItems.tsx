import { icons } from '@/shared/config';
import type { OverrideMeta } from '@common/types';
import { fileName } from '@/shared/lib';
import type { EditorTabItem } from '@/shared/ui/editor-tabs';
import { Icon } from '@/shared/ui/icon';
import { isPageDirty, type PageTab, type SourceTab, type TabMeta } from '@/entities/editor-tab';
import { overrideLabel } from '@/entities/override';
import { KindIcon } from '@/entities/resource';
import { cleanLabel, parseSourceUrl } from '@/entities/source-map';
import { fileTabTitle } from './fileTabTitle';
import { PAGE_TAB_ICONS } from './pageTabIcons';

/** Tab icons: a file's kind and a page's glyph line up. */
const TAB_ICON_SIZE = 13;

/**
 * The tab strip: files (italic until saved as an override; a held request's marked), then read-only originals, then pages. A
 * GraphQL response is named by its operation: the tab's own until saved, then its override's.
 */
export function stripItems(
  tabs: readonly TabMeta[],
  sources: readonly SourceTab[],
  pages: readonly PageTab[],
  overrides: Readonly<Record<string, OverrideMeta>>,
): EditorTabItem[] {
  return [
    ...tabs.map((t) => ({
      id: t.id,
      label: overrideLabel(t.url, t.request ?? (t.overrideId ? overrides[t.overrideId]?.request : undefined)),
      icon: t.held ? <Icon icon={icons.PauseIcon} size={TAB_ICON_SIZE} className="text-warning" /> : <KindIcon kind={t.kind} size={TAB_ICON_SIZE} />,
      dirty: t.dirty,
      italic: !t.overrideId,
      title: fileTabTitle(t),
    })),
    ...sources.map((t) => ({
      id: t.id,
      label: parseSourceUrl(t.url).file,
      icon: <Icon icon={icons.SourceFileIcon} size={TAB_ICON_SIZE} className="text-info" />,
      title: `${cleanLabel(t.url)}\nOriginal source, read-only · from ${fileName(t.bundleUrl)}`,
    })),
    ...pages.map((p) => ({
      id: p.id,
      label: p.title,
      icon: <Icon icon={PAGE_TAB_ICONS[p.page].icon} size={TAB_ICON_SIZE} className={PAGE_TAB_ICONS[p.page].className} />,
      dirty: isPageDirty(p),
      title: p.title,
    })),
  ];
}
