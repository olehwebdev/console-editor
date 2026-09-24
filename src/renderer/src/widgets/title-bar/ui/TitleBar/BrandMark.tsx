import appIcon from './app-icon.png';
import appIcon2x from './app-icon@2x.png';

/** The app icon, drawn edge to edge at 24 px (build/ holds the installers' versions). */
export function BrandMark() {
  return <img src={appIcon} srcSet={`${appIcon2x} 2x`} alt="" draggable={false} className="size-6 shrink-0 select-none" />;
}
