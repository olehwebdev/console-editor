import { useState } from 'react';
import { ANY_METHOD } from '@common/overrides';
import { BREAKPOINT_STAGES } from '@common/types';
import { icons } from '@/shared/config';
import { BUTTON_ICON_SIZE, Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { UrlMatcherFields } from '@/shared/ui/url-matcher';
import { addBreakpoint, BLANK_BREAKPOINT, BREAKPOINT_METHODS, STAGE_LABELS } from '../../model';
import { ChoiceMenu } from './ChoiceMenu';

/** Writes a breakpoint: which URLs and method it stops, and where. Added on Enter or Add, then the form clears. */
export function NewBreakpoint() {
  const [value, setValue] = useState(BLANK_BREAKPOINT);
  const add = () => {
    if (addBreakpoint(value)) setValue(BLANK_BREAKPOINT);
  };
  return (
    <div className="flex flex-col gap-1.5 border-t border-line pt-2" data-testid="breakpoint-new">
      <div className="flex flex-wrap items-center gap-2">
        <UrlMatcherFields testIdPrefix="breakpoint-match" value={value.match} onChange={(match) => setValue({ ...value, match })} onEnter={add} autoFocus />
      </div>
      <div className="flex items-center gap-2">
        <ChoiceMenu
          label="Method"
          value={value.method}
          choices={BREAKPOINT_METHODS}
          text={(method) => (method === ANY_METHOD ? 'Any method' : method)}
          onChange={(method) => setValue({ ...value, method })}
          testId="breakpoint-method"
        />
        <ChoiceMenu label="Stage" value={value.stage} choices={BREAKPOINT_STAGES} text={(stage) => STAGE_LABELS[stage]} onChange={(stage) => setValue({ ...value, stage })} testId="breakpoint-stage" />
        <Button size="sm" variant="primary" className="ml-auto" leading={<Icon icon={icons.AddIcon} size={BUTTON_ICON_SIZE.sm} />} onClick={add} data-testid="breakpoint-add">
          Add
        </Button>
      </div>
    </div>
  );
}
