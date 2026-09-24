import { useState } from 'react';
import { icons } from '@/shared/config';
import { Badge } from '@/shared/ui/badge';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Input } from '@/shared/ui/input';
import { Kbd } from '@/shared/ui/kbd';
import { Block } from '../../Block';
import { SHORTCUT, SLOT_ICON_SIZE } from './constants';

const { CloseIcon, GlobeIcon, SearchIcon, WarningIcon } = icons;

export function InputsBlock() {
  const [query, setQuery] = useState('');
  return (
    <Block title="Input" hint="adornments, sizes, mono, invalid, disabled">
      <div className="grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        <Input
          placeholder="Filter resources"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Icon icon={SearchIcon} size={SLOT_ICON_SIZE.md} />}
          trailing={
            query ? (
              <IconButton
                size="sm"
                icon={CloseIcon}
                label="Clear"
                noTooltip
                className="-mr-1 size-5"
                onClick={() => setQuery('')}
              />
            ) : (
              <Kbd keys={SHORTCUT.quickOpen} />
            )
          }
        />
        <Input mono defaultValue="https://example.com/static/js/main.js" leading={<Icon icon={GlobeIcon} size={SLOT_ICON_SIZE.md} />} />
        <Input
          mono
          invalid
          defaultValue="*.example.[com"
          leading={<Icon icon={WarningIcon} size={SLOT_ICON_SIZE.md} className="text-danger" />}
          aria-label="Match rule"
        />
        <Input disabled placeholder="Disabled" />
        <Input size="sm" placeholder="Small input" leading={<Icon icon={SearchIcon} size={SLOT_ICON_SIZE.sm} />} />
        <Input size="sm" mono placeholder="/api/*" trailing={<Badge>regex</Badge>} />
      </div>
    </Block>
  );
}
