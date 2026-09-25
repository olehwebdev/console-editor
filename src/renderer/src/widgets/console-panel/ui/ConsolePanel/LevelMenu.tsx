import { CONSOLE_LEVELS } from '@common/types';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import { useConsoleFilter } from '@/features/filter-console';
import { LEVEL_LABEL } from './constants';
import { levelSummary } from './levelSummary';

const { toggleLevel } = useConsoleFilter.getState();

/** Which levels of the page's rows show (as DevTools' level menu). */
export function LevelMenu() {
  const levels = useConsoleFilter((s) => s.levels);
  return (
    <Menu label="Levels" align="end" items={CONSOLE_LEVELS.map((level) => ({ label: LEVEL_LABEL[level], checked: levels[level], onSelect: () => toggleLevel(level) }))}>
      <Button variant="ghost" size="sm" trailing={<Icon icon={icons.ChevronDownIcon} size={12} />} className="min-w-0 shrink-[100]">
        <span className="truncate">{levelSummary(levels)}</span>
      </Button>
    </Menu>
  );
}
