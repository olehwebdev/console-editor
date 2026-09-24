import { Add01Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { icons } from '@/shared/config';
import { Button } from '@/shared/ui/button';
import { HoverHighlight, hoverRow } from '@/shared/ui/hover-highlight';
import { Icon } from '@/shared/ui/icon';
import { IconButton } from '@/shared/ui/icon-button';
import { Section } from '@/shared/ui/section';
import { Block } from '../../Block';
import { ICON_SIZE } from './constants';

const { CssIcon, JsIcon } = icons;

export function SectionsBlock() {
  const [editorsOpen, setEditorsOpen] = useState(true);
  const overrides = ['main.3f9a1c.js', 'main.c0ffee.css', 'checkout.js', 'analytics.js', 'theme.css', 'app.js'];

  return (
    <Block title="Section" hint="caps header, count pill, hover actions, height animation, sticky, controlled">
      <div className="flex flex-wrap items-start gap-4">
        <div className="h-72 w-[300px] overflow-y-auto rounded-lg border border-line bg-surface">
          <Section
            title="Overrides"
            count={overrides.length}
            countTone="live"
            sticky
            actions={<IconButton icon={Add01Icon} label="New override" size="sm" />}
          >
            <HoverHighlight className="px-1.5 pb-1" role="list" aria-label="Overrides">
              {overrides.map((name) => (
                <div key={name} role="listitem" {...hoverRow} className="flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-fg-muted hover:text-fg">
                  <Icon icon={name.endsWith('.css') ? CssIcon : JsIcon} size={ICON_SIZE} className={name.endsWith('.css') ? 'text-kind-css' : 'text-kind-js'} />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="size-1.5 rounded-full bg-live" aria-label="Live" role="img" />
                </div>
              ))}
            </HoverHighlight>
          </Section>
          <Section
            title="Open editors"
            count={2}
            sticky
            open={editorsOpen}
            onOpenChange={setEditorsOpen}
            actionsVisible="always"
            actions={<IconButton icon={MoreHorizontalIcon} label="More" size="sm" />}
          >
            <p className="px-4 pb-2 text-[12px] leading-relaxed text-fg-subtle">
              Controlled: the button on the right toggles this section from outside. Sticky headers stay pinned while the list scrolls.
            </p>
          </Section>
          <Section title="Outline" sticky defaultOpen={false} keepMounted>
            <p className="px-4 pb-2 text-[12px] leading-relaxed text-fg-subtle">Collapsed by default, kept mounted (inert) while closed.</p>
          </Section>
          <Section title="Timeline" collapsible={false} count={0}>
            <p className="px-4 pb-3 text-[12px] text-fg-subtle">A static header (collapsible=false).</p>
          </Section>
        </div>
        <Button size="sm" onClick={() => setEditorsOpen((v) => !v)}>
          {editorsOpen ? 'Collapse' : 'Expand'} “Open editors”
        </Button>
      </div>
    </Block>
  );
}
