export interface DesktopEntryTarget {
  /** The file the entry starts: the AppImage, or the executable of an unpacked .tar.gz. */
  launcher: string;
  /** The folder of bundled icons, one `<n>x<n>.png` per size. */
  bundledIcons: string;
  /** The user's XDG data folder, where the entry and icons go. */
  dataHome: string;
}
