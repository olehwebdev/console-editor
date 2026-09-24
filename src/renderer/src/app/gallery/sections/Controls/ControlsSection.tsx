import { BadgesBlock } from './BadgesBlock';
import { ButtonsBlock } from './ButtonsBlock';
import { CounterBlock } from './CounterBlock';
import { IconButtonsBlock } from './IconButtonsBlock';
import { InputsBlock } from './InputsBlock';
import { LoadingBlock } from './LoadingBlock';
import { SwitchBlock } from './SwitchBlock';
import { TooltipBlock } from './TooltipBlock';

/** Gallery section for the CONTROLS group of shared/ui. */
export function ControlsSection() {
  return (
    <div className="flex flex-col gap-4">
      <ButtonsBlock />
      <IconButtonsBlock />
      <InputsBlock />
      <BadgesBlock />
      <CounterBlock />
      <SwitchBlock />
      <TooltipBlock />
      <LoadingBlock />
    </div>
  );
}
