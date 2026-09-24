import { Switch } from '@/shared/ui/switch';
import { SETTING_META, useSettingsStore } from '@/entities/settings';
import { setSetting } from '@/features/update-settings';

/** Sidebar view with every setting as a switch plus a one-line explanation. */
export function SettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="settings-panel">
      <header className="flex h-10 shrink-0 items-center pl-4">
        <span className="label-caps">Settings</span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3">
        {SETTING_META.map(({ key, label, help }) => (
          <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-hover">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-fg">{label}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-fg-subtle">{help}</span>
            </span>
            <Switch size="sm" tone="accent" checked={settings[key]} onCheckedChange={(on) => void setSetting(key, on)} aria-label={label} />
          </label>
        ))}
      </div>
    </div>
  );
}
