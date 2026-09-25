import { MAX_FRAME_NAME } from '@common/constants';
import { KEY } from '@/shared/config';
import { Input } from '@/shared/ui/input';
import { nameFrame } from '../model/nameFrame';

export interface FrameNameFormProps {
  /** The frame's `frameKey`, which the name is kept under. */
  frameKey: string;
  /** The name given so far ('' if none). */
  name: string;
  /** What it is called without one. */
  automatic: string;
  /** Where the frame is, for the hint. */
  address: string;
  /** Enter: the name is set. */
  onDone(): void;
}

/**
 * Names a frame for this workspace's console: "billing" instead of
 * `billing.example.com/embed`. Give it `key={frameKey}`: it starts from the name it opens on.
 */
export function FrameNameForm({ frameKey, name, automatic, address, onDone }: FrameNameFormProps) {
  return (
    <form
      className="flex w-[260px] flex-col gap-2"
      data-testid="frame-name-form"
      onSubmit={(event) => {
        event.preventDefault();
        const typed = new FormData(event.currentTarget).get('name');
        void nameFrame(frameKey, typeof typed === 'string' ? typed : '');
        onDone();
      }}
    >
      <span className="label-caps">Frame name</span>
      <Input
        autoFocus
        name="name"
        aria-label="Frame name"
        data-testid="frame-name"
        defaultValue={name}
        maxLength={MAX_FRAME_NAME}
        placeholder={automatic}
        onKeyDown={(event) => {
          if (event.key === KEY.enter && !event.nativeEvent.isComposing) event.currentTarget.form?.requestSubmit();
        }}
      />
      <p className="text-[11.5px] leading-snug text-fg-subtle">
        Used in this workspace's console for {address || 'this frame'}. Leave it empty for the automatic name.
      </p>
    </form>
  );
}
