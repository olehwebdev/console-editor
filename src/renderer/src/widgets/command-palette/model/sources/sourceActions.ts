import { SHORTCUT } from '@common/constants';
import type { SourceMapKind } from '@common/types';
import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import type { SourceTab, TabMeta } from '@/entities/editor-tab';
import { isMappableKind } from '@/entities/source-map';
import { bundleUrlOf, goToBundle, goToOriginal, revealBundleSources } from '@/features/open-resource';

/** The jumps from the tab in front (an original, or a script or stylesheet), and showing its originals in the Explorer. */
export function sourceActions(active: TabMeta | null, activeSource: SourceTab | null, onShowExplorer: () => void): CommandItem[] {
  const show = (bundleUrl: string, kind: SourceMapKind) => {
    void revealBundleSources(bundleUrl, kind);
    onShowExplorer();
  };
  if (activeSource) {
    return [
      { id: 'go-to-bundle', label: 'Go to bundle code', icon: icons.JumpIcon, shortcut: SHORTCUT.jumpToMapped, onSelect: () => void goToBundle() },
      { id: 'show-source', label: 'Show in the Explorer', icon: icons.SourceRootIcon, onSelect: () => show(activeSource.bundleUrl, activeSource.bundleKind) },
    ];
  }
  if (!active || !isMappableKind(active.kind)) return [];
  const { kind } = active;
  return [
    { id: 'go-to-original', label: 'Go to original source', icon: icons.JumpIcon, shortcut: SHORTCUT.jumpToMapped, onSelect: () => void goToOriginal() },
    { id: 'show-sources', label: 'Show original sources in the Explorer', icon: icons.SourceRootIcon, onSelect: () => show(bundleUrlOf(active), kind) },
  ];
}
