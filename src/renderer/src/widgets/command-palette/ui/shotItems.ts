import { icons } from '@/shared/config';
import type { CommandItem } from '@/shared/ui/command-palette';
import { captureShot, pickToCapture } from '@/features/shot/capture';
import { importDesigns } from '@/features/shot/import-design';
import { openShot } from '@/features/shot/open-shot';

/** Keywords of every capture item. */
const CAPTURE_KEYWORDS = ['screenshot', 'capture', 'image', 'png'];

/** Capturing the page shown (what it shows, all of it, or an element picked in it), and importing designs. */
export function shotItems(hasPage: boolean): CommandItem[] {
  const importItem: CommandItem = { id: 'import-designs', label: 'Import designs…', icon: icons.ImportDesignIcon, keywords: ['design', 'mockup', 'figma', 'pixel perfect', 'image'], onSelect: () => void importDesigns(openShot) };
  if (!hasPage) return [importItem];
  return [
    { id: 'capture-viewport', label: 'Capture the page', icon: icons.CaptureIcon, keywords: CAPTURE_KEYWORDS, onSelect: () => void captureShot('viewport', null, openShot) },
    { id: 'capture-page', label: 'Capture the whole page', icon: icons.FullPageIcon, keywords: [...CAPTURE_KEYWORDS, 'full page'], onSelect: () => void captureShot('page', null, openShot) },
    { id: 'capture-element', label: 'Capture an element…', icon: icons.PickIcon, keywords: [...CAPTURE_KEYWORDS, 'pick', 'component'], onSelect: () => void pickToCapture() },
    importItem,
  ];
}
