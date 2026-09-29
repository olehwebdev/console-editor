import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import { captureEverywhere, captureShot, pickToCapture } from '@/features/shot/capture';
import { openGroup } from '@/features/shot/compare';
import { importDesigns } from '@/features/shot/import-design';
import { openShot } from '@/features/shot/open-shot';

/** Keywords of every capture item. */
const CAPTURE_KEYWORDS = ['screenshot', 'capture', 'image', 'png'];

/** Capturing the page shown (what it shows, all of it, an element picked in it, or in every browser), and importing designs. */
export function shotItems(hasPage: boolean): CommandItem[] {
  const importItem: CommandItem = { id: 'import-designs', label: 'Import designs…', icon: icons.ImportDesignIcon, keywords: ['design', 'mockup', 'figma', 'pixel perfect', 'image'], onSelect: () => void importDesigns(openShot) };
  if (!hasPage) return [importItem];
  return [
    { id: 'capture-viewport', label: 'Capture the page', icon: icons.CaptureIcon, keywords: CAPTURE_KEYWORDS, onSelect: () => void captureShot('viewport', null, openShot) },
    { id: 'capture-page', label: 'Capture the whole page', icon: icons.FullPageIcon, keywords: [...CAPTURE_KEYWORDS, 'full page'], onSelect: () => void captureShot('page', null, openShot) },
    { id: 'capture-element', label: 'Capture an element…', icon: icons.PickIcon, keywords: [...CAPTURE_KEYWORDS, 'pick', 'component'], onSelect: () => void pickToCapture() },
    {
      id: 'capture-every-browser',
      label: 'Capture in every browser',
      icon: icons.BrowserIcon,
      keywords: [...CAPTURE_KEYWORDS, 'browsers', 'cross-browser', 'compare'],
      onSelect: () => void captureEverywhere(({ shots: [first] }) => openGroup(first)),
    },
    importItem,
  ];
}
